import { Router } from "express";
import ChatController from "../controllers/chat.controller";
import ChatMiddleware from "../middlewares/chat.middleware";
import ProtectMiddleware from "../middlewares/protect.middleware";
import UploadMiddleware from "../middlewares/upload.middleware";

const ChatRoute = Router();

ChatRoute.post("/ask", [ChatMiddleware.askChatbot], ChatController.askChatbot);

ChatRoute.post(
  "/conversations/find-or-create",
  [ProtectMiddleware.owner, ChatMiddleware.findOrCreateConversation],
  ChatController.findOrCreateConversation,
);

ChatRoute.get(
  "/conversations",
  [ProtectMiddleware.ownerOrSitter],
  ChatController.getConversations,
);

ChatRoute.get(
  "/conversations/:conversationId",
  [ProtectMiddleware.owner, ChatMiddleware.conversationIdParam],
  ChatController.getConversationById,
);

ChatRoute.get(
  "/conversations/:conversationId/messages",
  [
    ProtectMiddleware.ownerOrSitter,
    ChatMiddleware.conversationIdParam,
    ChatMiddleware.getConversationMessagesQuery,
  ],
  ChatController.getConversationMessagesById,
);

ChatRoute.post(
  "/conversations/:conversationId/images",
  [
    ProtectMiddleware.ownerOrSitter,
    ChatMiddleware.conversationIdParam,
    UploadMiddleware.singleImage("image"),
    UploadMiddleware.requireFile("image"),
  ],
  ChatController.uploadConversationImage,
);

export default ChatRoute;
