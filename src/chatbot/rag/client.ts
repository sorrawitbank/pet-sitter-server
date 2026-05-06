import "dotenv/config";
import axios from "axios";
import { AskChatbotResponse } from "../../types/chat";

if (!process.env.RAG_SERVICE_URL) {
  console.error("RAG_SERVICE_URL is not set in environment variables");
  throw new Error("RAG_SERVICE_URL is required");
}

const ragClient = {
  askChatbot: async (query: string, topK?: number) => {
    const response = await axios.post<AskChatbotResponse>(
      `${process.env.RAG_SERVICE_URL}/api/documents/query`,
      {
        query,
        top_k: topK,
      },
    );
    return response.data;
  },
};

export default ragClient;
