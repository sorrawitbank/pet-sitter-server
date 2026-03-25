import type { Request } from "express";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "./user";

export interface DocumentMetadata {
  tradeName?: string;
  provinceId?: number;
  districtId?: number;
  petTypeIds?: number[];
}

export type RequestWithUser<
  P = {},
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
> = Request<P, ResBody, ReqBody, ReqQuery> & { user?: User & { role: UserRole } };

export interface AskChatbotBody {
  query: string;
  topK?: number;
}

export interface FindOrCreateConversationBody {
  sitterId: number;
}

export interface ConversationIdParams {
  conversationId: string;
}

export interface GetConversationMessagesQuery {
  limit?: string;
}

export interface AskChatbotResponse {
  query: string;
  introduction: string;
  sitters: {
    sitterId: string;
    tradeName: string;
    description: string;
  }[];
  confidence: "High" | "Medium" | "Low" | null;
}

export interface ConversationResponse {
  conversationId: string;
  ownerUserId: string;
  petSitterId: number;
}

export interface ConversationListItemResponse {
  conversationId: string;
  name: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ConversationMessageResponse {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  messageType: "text" | "image";
  imageUrl: string | null;
  createdAt: string;
}
