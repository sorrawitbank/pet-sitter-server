import AppError from "../errors/AppError";
import ChatRepository from "../repositories/chat.repository";
import { AskChatbotResponse } from "../types/chat";
import textQuery from "../chatbot/dialogflow/textQuery";
import ragClient from "../chatbot/rag/client";
import intentResponse from "../chatbot/response";
import detectLanguage from "../utils/detectLanguage";

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
};

export default ChatService;
