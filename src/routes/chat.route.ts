import { Router } from "express";
import ChatController from "../controllers/chat.controller";
import ChatMiddleware from "../middlewares/chat.middleware";
import ProtectMiddleware from "../middlewares/protect.middleware";

const ChatRoute = Router();

ChatRoute.post("/ask", [ChatMiddleware.askChatbot], ChatController.askChatbot);

ChatRoute.post(
  "/conversations/find-or-create",
  [ProtectMiddleware.owner, ChatMiddleware.findOrCreateConversation],
  ChatController.findOrCreateConversation,
);

ChatRoute.get(
  "/conversations/:conversationId",
  [ProtectMiddleware.owner, ChatMiddleware.conversationIdParam],
  ChatController.getConversationById,
);

export default ChatRoute;
