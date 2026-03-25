import AppError from "../errors/AppError";
import ChatRepository from "../repositories/chat.repository";
import supabaseAdmin from "../supabase/admin";
import { format } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import {
  AskChatbotResponse,
  ConversationListItemResponse,
  ConversationMessageResponse,
} from "../types/chat";
import { UserRole } from "../types/user";
import textQuery from "../chatbot/dialogflow/textQuery";
import ragClient from "../chatbot/rag/client";
import intentResponse from "../chatbot/response";
import detectLanguage from "../utils/detectLanguage";

const DEFAULT_MESSAGE_LIMIT = 30;
const MAX_MESSAGE_LIMIT = 100;
const CHAT_IMAGE_BUCKET = "chat-img";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 15;
const SIGNED_URL_TTL_SECONDS = Number.isFinite(
  Number(process.env.CHAT_IMAGE_SIGNED_URL_TTL_SECONDS),
)
  ? Math.max(60, Number(process.env.CHAT_IMAGE_SIGNED_URL_TTL_SECONDS))
  : DEFAULT_SIGNED_URL_TTL_SECONDS;

const isAbsoluteHttpUrl = (value: string) => /^https?:\/\//i.test(value);
const LEGACY_PUBLIC_PREFIX = `/storage/v1/object/public/${CHAT_IMAGE_BUCKET}/`;

const extractLegacyPublicPath = (value: string): string | null => {
  const prefixIndex = value.indexOf(LEGACY_PUBLIC_PREFIX);
  if (prefixIndex < 0) return null;

  const pathWithMaybeQuery = value.slice(prefixIndex + LEGACY_PUBLIC_PREFIX.length);
  const [path] = pathWithMaybeQuery.split("?");
  return path ? decodeURIComponent(path) : null;
};

const resolveMessageImageUrl = async (
  storedImagePathOrUrl: string | null,
): Promise<string | null> => {
  if (!storedImagePathOrUrl) return null;

  let objectPath = storedImagePathOrUrl;

  // Backward compatibility for old rows that stored public URL in DB.
  if (isAbsoluteHttpUrl(objectPath)) {
    const legacyPath = extractLegacyPublicPath(objectPath);
    if (!legacyPath) {
      // Non-storage absolute URL can still be rendered directly.
      return objectPath;
    }
    objectPath = legacyPath;
  }

  if (!objectPath) {
    return storedImagePathOrUrl;
  }

  const { data, error } = await supabaseAdmin.storage
    .from(CHAT_IMAGE_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.warn("Failed to create signed URL for chat image:", {
      path: objectPath,
      message: error?.message,
    });
    return null;
  }

  return data.signedUrl;
};

const toConversationMessage = async (row: {
  messageId: string;
  conversationId: string;
  senderUserId: string;
  textContent: string | null;
  messageType: "text" | "image";
  imgUrl: string | null;
  createdAt: string;
}): Promise<ConversationMessageResponse> => {
  const imageUrl =
    row.messageType === "image" ? await resolveMessageImageUrl(row.imgUrl) : null;

  return {
    id: row.messageId,
    conversationId: row.conversationId,
    senderId: row.senderUserId,
    text: row.textContent ?? "",
    messageType: row.messageType,
    imageUrl,
    createdAt: row.createdAt,
  };
};

const ChatService = {
  askChatbot: async (query: string, topK: number, userId?: string) => {
    const language = detectLanguage(query);

    // Find the intent of the query
    const intent = (await textQuery(query, language, userId))[0].queryResult
      .intent.displayName;

    let result: AskChatbotResponse;

    // Handle the intent
    if (intent === "welcome_intent") {
      result = {
        query: query,
        introduction: intentResponse.welcome(language),
        sitters: [],
        confidence: null,
      };
    } else if (intent === "bot_capability_intent") {
      result = {
        query: query,
        introduction: intentResponse.botCapability(language),
        sitters: [],
        confidence: null,
      };
    } else if (intent === "search_sitter_general_intent") {
      result = {
        query: query,
        introduction: intentResponse.searchSitterGeneral(language),
        sitters: [],
        confidence: null,
      };
    } else if (intent === "search_sitter_intent") {
      result = await ragClient.askChatbot(query, topK);
    } else if (intent === "thank_you_intent") {
      result = {
        query: query,
        introduction: intentResponse.thankYou(language),
        sitters: [],
        confidence: null,
      };
    } else {
      result = {
        query: query,
        introduction: intentResponse.fallback(language),
        sitters: [],
        confidence: null,
      };
    }

    return result;
  },

  findOrCreateConversation: async (ownerUserId: string, sitterId: number) => {
    try {
      const created = await ChatRepository.createConversationIfNotExists(
        ownerUserId,
        sitterId,
      );

      if (created) return created;

      const existing = await ChatRepository.findConversationByOwnerAndSitter(
        ownerUserId,
        sitterId,
      );

      if (!existing) {
        throw new AppError(404, "Conversation not found");
      }

      return existing;
    } catch (error: any) {
      // FK constraint: sitter does not exist
      if (error?.code === "23503") {
        throw new AppError(404, "Pet sitter not found");
      }
      throw error;
    }
  },

  getConversationByIdForOwner: async (
    conversationId: string,
    ownerUserId: string,
  ) => {
    const conversation = await ChatRepository.findConversationByIdAndOwner(
      conversationId,
      ownerUserId,
    );

    if (!conversation) {
      throw new AppError(404, "Conversation not found");
    }

    return conversation;
  },

  getConversationListForUser: async (
    userId: string,
    role: UserRole,
  ): Promise<ConversationListItemResponse[]> => {
    const withUnreadCount = async <T extends { conversationId: string }>(
      rows: T[],
      mapper: (row: T) => Omit<ConversationListItemResponse, "unreadCount">,
    ): Promise<ConversationListItemResponse[]> => {
      return Promise.all(
        rows.map(async (row) => {
          const readState =
            await ChatRepository.getConversationReadByConversationAndUser(
              row.conversationId,
              userId,
            );
          const lastReadMessageId = readState?.lastReadMessageId;
          const lastReadMessage = lastReadMessageId
            ? await ChatRepository.getMessageById(lastReadMessageId)
            : undefined;
          const unreadCount = await ChatRepository.countUnreadMessagesForUser(
            row.conversationId,
            userId,
            lastReadMessage?.createdAt,
          );

          return {
            ...mapper(row),
            unreadCount,
          };
        }),
      );
    };

    if (role === "owner") {
      const rows =
        await ChatRepository.findConversationListByOwnerUserId(userId);
      return withUnreadCount(rows, (row) => ({
        conversationId: row.conversationId,
        name: row.tradeName ?? row.sitterName ?? "Pet Sitter",
        avatarUrl: row.avatarUrl ?? null,
        lastMessage:
          row.lastMessageText ??
          (row.lastMessageType === "image" || !!row.lastMessageImgUrl
            ? "[Image]"
            : ""),
        lastMessageAt: row.lastMessageCreatedAt ?? row.updatedAt,
      }));
    }

    if (role === "sitter") {
      const rows =
        await ChatRepository.findConversationListBySitterUserId(userId);
      return withUnreadCount(rows, (row) => ({
        conversationId: row.conversationId,
        name: row.ownerName ?? "Pet Owner",
        avatarUrl: row.avatarUrl ?? null,
        lastMessage:
          row.lastMessageText ??
          (row.lastMessageType === "image" || !!row.lastMessageImgUrl
            ? "[Image]"
            : ""),
        lastMessageAt: row.lastMessageCreatedAt ?? row.updatedAt,
      }));
    }

    throw new AppError(
      403,
      "Forbidden: You do not have owner or pet sitter access",
    );
  },

  getConversationMessagesByIdForUser: async (
    conversationId: string,
    userId: string,
    limit?: number,
  ): Promise<ConversationMessageResponse[]> => {
    const access =
      await ChatRepository.findConversationAccessById(conversationId);

    if (!access) {
      throw new AppError(404, "Conversation not found");
    }

    const hasAccess =
      access.ownerUserId === userId || access.sitterUserId === userId;

    if (!hasAccess) {
      throw new AppError(403, "Forbidden conversation");
    }

    const requestedLimit = limit ?? DEFAULT_MESSAGE_LIMIT;
    const normalizedLimit = Math.min(
      Math.max(requestedLimit, 1),
      MAX_MESSAGE_LIMIT,
    );

    const rows = await ChatRepository.getMessagesByConversationId(
      conversationId,
      normalizedLimit,
    );

    return Promise.all(rows.reverse().map((row) => toConversationMessage(row)));
  },

  createImageMessageForUser: async (
    conversationId: string,
    userId: string,
    file: Express.Multer.File,
  ): Promise<ConversationMessageResponse> => {
    const access =
      await ChatRepository.findConversationAccessById(conversationId);
    if (!access) {
      throw new AppError(404, "Conversation not found");
    }

    const hasAccess =
      access.ownerUserId === userId || access.sitterUserId === userId;
    if (!hasAccess) {
      throw new AppError(403, "Forbidden conversation");
    }

    const now = new UTCDate();
    const fileExt = file.mimetype.split("/")[1] || "jpg";
    const filePath = `${conversationId}/${userId}-${format(
      now,
      "yyyyMMddHHmmss",
    )}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(CHAT_IMAGE_BUCKET)
      .upload(filePath, file.buffer, { contentType: file.mimetype });

    if (uploadError) {
      throw uploadError;
    }

    try {
      const insertedMessage = await ChatRepository.createMessage({
        conversationId,
        senderUserId: userId,
        messageType: "image",
        imgUrl: filePath,
      });

      await ChatRepository.updateConversationLastMessage(
        conversationId,
        insertedMessage.messageId,
      );

      return await toConversationMessage(insertedMessage);
    } catch (error) {
      await supabaseAdmin.storage.from(CHAT_IMAGE_BUCKET).remove([filePath]);
      throw error;
    }
  },
};

export default ChatService;
