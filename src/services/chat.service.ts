import AppError from "../errors/AppError";
import ChatRepository from "../repositories/chat.repository";
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
      const rows = await ChatRepository.findConversationListByOwnerUserId(userId);
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
      const rows = await ChatRepository.findConversationListBySitterUserId(userId);
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

    throw new AppError(403, "Forbidden: You do not have owner or pet sitter access");
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

    return rows.reverse().map((row) => ({
      id: row.messageId,
      conversationId: row.conversationId,
      senderId: row.senderUserId,
      text: row.textContent ?? "",
      createdAt: row.createdAt,
    }));
  },
};

export default ChatService;
