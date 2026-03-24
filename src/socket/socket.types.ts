export interface SendMessagePayload {
  conversationId: string;
  text: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  messageType: "text" | "image";
  imageUrl: string | null;
  createdAt: string;
}

export interface JoinConversationPayload {
  conversationId: string;
}

export interface GetMessagesPayload {
  conversationId: string;
  limit?: number;
}

export interface MarkAsReadPayload {
  conversationId: string;
  messageId: string;
}

export interface TypingPayload {
  conversationId: string;
}

export interface SocketAck<T = undefined> {
  ok: boolean;
  data?: T;
  error?: string;
}