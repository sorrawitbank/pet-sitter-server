import { NextFunction, Request, Response } from "express";
import {
  AskChatbotBody,
  FindOrCreateConversationBody,
} from "../types/chat";

const ChatMiddleware = {
  askChatbot: (
    req: Request<{}, {}, Partial<AskChatbotBody>>,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.body) {
      return res.status(400).json({ error: "Body is required" });
    }

    const { query, topK } = req.body;

    // Check for required fields
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Type validations
    if (typeof query !== "string") {
      return res.status(400).json({ error: "Query must be a string" });
    }

    if (query.trim().length < 5) {
      return res.status(400).json({
        error: "Query must be at least 5 characters long",
      });
    }

    if (topK !== undefined) {
      if (!Number.isInteger(topK) || topK <= 0) {
        return res.status(400).json({
          error: "Top K must be a positive integer",
        });
      }

      if (topK > 10) {
        return res.status(400).json({
          error: "Top K must be less than or equal to 10",
        });
      }
    }

    next();
  },
  findOrCreateConversation: (
    req: Request<{}, {}, Partial<FindOrCreateConversationBody>>,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.body) {
      return res.status(400).json({ error: "Body is required" });
    }

    const { sitterId } = req.body;

    if (sitterId === undefined || sitterId === null) {
      return res.status(400).json({ error: "sitterId is required" });
    }

    if (!Number.isInteger(sitterId) || sitterId <= 0) {
      return res
        .status(400)
        .json({ error: "sitterId must be a positive integer" });
    }

    next();
  },
  conversationIdParam: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const rawConversationId = req.params?.conversationId;
    const conversationId = Array.isArray(rawConversationId)
      ? rawConversationId[0]
      : rawConversationId;

    if (!conversationId) {
      return res.status(400).json({ error: "conversationId is required" });
    }

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        conversationId,
      );

    if (!isUuid) {
      return res.status(400).json({ error: "Invalid conversationId format" });
    }

    next();
  },
  getConversationMessagesQuery: (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    const rawLimit = req.query?.limit;
    const limit = Array.isArray(rawLimit) ? rawLimit[0] : rawLimit;
    const rawBefore = req.query?.before;
    const before = Array.isArray(rawBefore) ? rawBefore[0] : rawBefore;

    if (before !== undefined) {
      if (typeof before !== "string") {
        return res.status(400).json({ error: "before must be a valid datetime" });
      }
      const parsed = Date.parse(before);
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ error: "before must be a valid datetime" });
      }
    }

    if (limit === undefined) {
      next();
      return;
    }

    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      return res
        .status(400)
        .json({ error: "limit must be a positive integer" });
    }

    if (parsedLimit > 100) {
      return res
        .status(400)
        .json({ error: "limit must be less than or equal to 100" });
    }

    next();
  },
};

export default ChatMiddleware;
