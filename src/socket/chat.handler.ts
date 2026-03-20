import { Server, Socket } from "socket.io";
import ChatRepository from "../repositories/chat.repository";
import {
  ChatMessage,
  GetMessagesPayload,
  JoinConversationPayload,
  MarkAsReadPayload,
  SendMessagePayload,
  SocketAck,
  TypingPayload,
} from "./socket.types";

const DEFAULT_MESSAGE_LIMIT = 30;
const MAX_MESSAGE_LIMIT = 100;

async function canAccessConversation(
  userId: string,
  conversationId: string,
): Promise<boolean> {
  const row = await ChatRepository.findConversationAccessById(conversationId);

  if (!row) return false;
  return row.ownerUserId === userId || row.sitterUserId === userId;
}

function toChatMessage(row: {
  messageId: string;
  conversationId: string;
  senderUserId: string;
  textContent: string | null;
  createdAt: string;
}): ChatMessage {
  return {
    id: row.messageId,
    conversationId: row.conversationId,
    senderId: row.senderUserId,
    text: row.textContent ?? "",
    createdAt: row.createdAt,
  };
}

export default function registerChatHandlers(io: Server, socket: Socket) {
  socket.on(
    "join-conversation",
    async (
      payload: JoinConversationPayload,
      ack?: (response: SocketAck) => void,
    ) => {
      const userId = socket.data.user?.id as string | undefined;

      if (!userId) {
        ack?.({ ok: false, error: "Unauthorized" });
        return;
      }

      if (!payload?.conversationId) {
        ack?.({ ok: false, error: "conversationId is required" });
        return;
      }

      const isAuthorized = await canAccessConversation(
        userId,
        payload.conversationId,
      );
      if (!isAuthorized) {
        ack?.({ ok: false, error: "Forbidden conversation" });
        return;
      }

      socket.join(payload.conversationId);
      console.log(
        `Socket ${socket.id} (userId=${socket.data.user?.id}) joined room ${payload.conversationId}`,
      );
      ack?.({ ok: true });
    },
  );

  socket.on(
    "send-message",
    async (
      payload: SendMessagePayload,
      ack?: (response: SocketAck<{ message: ChatMessage }>) => void,
    ) => {
      const userId = socket.data.user?.id as string | undefined;

      if (!userId) {
        console.warn(
          `Blocked send-message from unauthenticated socket. socketId=${socket.id}`,
        );
        ack?.({ ok: false, error: "Unauthorized" });
        return;
      }

      if (!payload?.conversationId) {
        ack?.({ ok: false, error: "conversationId is required" });
        return;
      }

      if (!payload.text?.trim()) {
        ack?.({ ok: false, error: "Message text is required" });
        return;
      }

      const isAuthorized = await canAccessConversation(
        userId,
        payload.conversationId,
      );
      if (!isAuthorized) {
        ack?.({ ok: false, error: "Forbidden conversation" });
        return;
      }

      const insertedMessage = await ChatRepository.createMessage(
        payload.conversationId,
        userId,
        payload.text.trim(),
      );

      await ChatRepository.updateConversationLastMessage(
        payload.conversationId,
        insertedMessage.messageId,
      );

      const message = toChatMessage(insertedMessage);
      io.to(payload.conversationId).emit("new-message", message);
      ack?.({ ok: true, data: { message } });
      console.log("message sent", message);
    },
  );

  socket.on(
    "get-messages",
    async (
      payload: GetMessagesPayload,
      ack?: (response: SocketAck<{ messages: ChatMessage[] }>) => void,
    ) => {
      const userId = socket.data.user?.id as string | undefined;
      if (!userId) {
        ack?.({ ok: false, error: "Unauthorized" });
        return;
      }

      if (!payload?.conversationId) {
        ack?.({ ok: false, error: "conversationId is required" });
        return;
      }

      const isAuthorized = await canAccessConversation(
        userId,
        payload.conversationId,
      );
      if (!isAuthorized) {
        ack?.({ ok: false, error: "Forbidden conversation" });
        return;
      }

      const requestedLimit = payload.limit ?? DEFAULT_MESSAGE_LIMIT;
      const limit = Math.min(Math.max(requestedLimit, 1), MAX_MESSAGE_LIMIT);

      const rows = await ChatRepository.getMessagesByConversationId(
        payload.conversationId,
        limit,
      );

      const chatMessages = rows.reverse().map((row) => toChatMessage(row));
      ack?.({ ok: true, data: { messages: chatMessages } });
    },
  );

  socket.on(
    "mark-as-read",
    async (
      payload: MarkAsReadPayload,
      ack?: (response: SocketAck<{ conversationId: string; messageId: string }>) => void,
    ) => {
      const userId = socket.data.user?.id as string | undefined;
      if (!userId) {
        ack?.({ ok: false, error: "Unauthorized" });
        return;
      }

      if (!payload?.conversationId || !payload?.messageId) {
        ack?.({ ok: false, error: "conversationId and messageId are required" });
        return;
      }

      const isAuthorized = await canAccessConversation(
        userId,
        payload.conversationId,
      );
      if (!isAuthorized) {
        ack?.({ ok: false, error: "Forbidden conversation" });
        return;
      }

      const messageInConversation = await ChatRepository.findMessageInConversation(
        payload.messageId,
        payload.conversationId,
      );

      if (!messageInConversation) {
        ack?.({ ok: false, error: "Message not found in this conversation" });
        return;
      }

      const now = new Date().toISOString();
      await ChatRepository.upsertConversationRead(
        payload.conversationId,
        userId,
        payload.messageId,
        now,
      );

      const responseData = {
        conversationId: payload.conversationId,
        messageId: payload.messageId,
      };
      io.to(payload.conversationId).emit("message-read", {
        ...responseData,
        userId,
        readAt: now,
      });
      ack?.({ ok: true, data: responseData });
    },
  );

  socket.on("typing-start", async (payload: TypingPayload) => {
    const userId = socket.data.user?.id as string | undefined;
    if (!userId || !payload?.conversationId) return;

    const isAuthorized = await canAccessConversation(userId, payload.conversationId);
    if (!isAuthorized) return;

    socket.to(payload.conversationId).emit("typing-start", {
      conversationId: payload.conversationId,
      userId,
    });
  });

  socket.on("typing-stop", async (payload: TypingPayload) => {
    const userId = socket.data.user?.id as string | undefined;
    if (!userId || !payload?.conversationId) return;

    const isAuthorized = await canAccessConversation(userId, payload.conversationId);
    if (!isAuthorized) return;

    socket.to(payload.conversationId).emit("typing-stop", {
      conversationId: payload.conversationId,
      userId,
    });
  });

  socket.on("leave-conversation", (conversationId: string) => {
    socket.leave(conversationId);
    console.log(
      `Socket ${socket.id} (userId=${socket.data.user?.id}) left room ${conversationId}`,
    );
  });
}