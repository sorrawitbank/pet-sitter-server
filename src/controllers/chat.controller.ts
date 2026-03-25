import { Request, Response } from "express";
import AppError from "../errors/AppError";
import AuthService from "../services/auth.service";
import ChatService from "../services/chat.service";
import { getSocketServer } from "../socket/io";
import {
  AskChatbotBody,
  ConversationIdParams,
  FindOrCreateConversationBody,
  RequestWithUser,
} from "../types/chat";

const ChatController = {
  askChatbot: async (req: Request<{}, {}, AskChatbotBody>, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1];
    const query = req.body.query;
    const topK = req.body.topK || 5;
    let userId;
    let result;

    if (token) {
      userId = (await AuthService.getUser(token)).data.user.id;
    }

    try {
      result = await ChatService.askChatbot(query, topK, userId);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    const answerResponse = {
      query: result.query,
      introduction: result.introduction,
      petSitters: result.sitters,
      confidence: result.confidence,
    };

    return res.status(200).json(answerResponse);
  },
  findOrCreateConversation: async (
    req: RequestWithUser<{}, {}, FindOrCreateConversationBody>,
    res: Response,
  ) => {
    const ownerUserId = req.user?.id;

    if (!ownerUserId) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    try {
      const conversation = await ChatService.findOrCreateConversation(
        ownerUserId,
        req.body.sitterId,
      );

      return res.status(200).json(conversation);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }
  },
  getConversations: async (req: RequestWithUser, res: Response) => {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId || !role) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    try {
      const conversations = await ChatService.getConversationListForUser(
        userId,
        role,
      );
      return res.status(200).json({ conversations });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }
  },
  getConversationById: async (req: RequestWithUser, res: Response) => {
    const ownerUserId = req.user?.id;
    const rawConversationId = (req.params as Partial<ConversationIdParams>)
      ?.conversationId;
    const conversationId = Array.isArray(rawConversationId)
      ? rawConversationId[0]
      : rawConversationId;

    if (!ownerUserId) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    try {
      const conversation = await ChatService.getConversationByIdForOwner(
        conversationId,
        ownerUserId,
      );

      return res.status(200).json(conversation);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }
  },
  getConversationMessagesById: async (req: RequestWithUser, res: Response) => {
    const userId = req.user?.id;
    const rawConversationId = (req.params as Partial<ConversationIdParams>)
      ?.conversationId;
    const conversationId = Array.isArray(rawConversationId)
      ? rawConversationId[0]
      : rawConversationId;
    const rawLimit = req.query?.limit;
    const limitValue = Array.isArray(rawLimit) ? rawLimit[0] : rawLimit;
    const limit = limitValue ? Number(limitValue) : undefined;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    try {
      const messages = await ChatService.getConversationMessagesByIdForUser(
        conversationId,
        userId,
        limit,
      );

      return res.status(200).json({
        conversationId,
        limit: limit ?? 30,
        messages,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }
  },
  uploadConversationImage: async (req: RequestWithUser, res: Response) => {
    const userId = req.user?.id;
    const rawConversationId = (req.params as Partial<ConversationIdParams>)
      ?.conversationId;
    const conversationId = Array.isArray(rawConversationId)
      ? rawConversationId[0]
      : rawConversationId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }
    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    try {
      const message = await ChatService.createImageMessageForUser(
        conversationId,
        userId,
        req.file,
      );

      const io = getSocketServer();
      io?.to(conversationId).emit("new-message", message);

      return res.status(201).json({ message });
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }
  },
};

export default ChatController;
