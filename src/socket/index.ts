import { Server } from "socket.io";
import registerChatHandlers from "./chat.handler";
import AuthService from "../services/auth.service";
import AppError from "../errors/AppError";

export default function initSocket(io: Server) {
  io.use(async (socket, next) => {
    try {
      const tokenFromAuthHeader =
        typeof socket.handshake.headers.authorization === "string"
          ? socket.handshake.headers.authorization.split(" ")[1]
          : undefined;

      const tokenFromAuth = socket.handshake.auth?.token as
        | string
        | undefined;

      const token = tokenFromAuthHeader || tokenFromAuth;

      if (!token) {
        return next(new AppError(401, "Unauthorized: Token missing for socket"));
      }

      const { user } = await AuthService.getUser(token);

      socket.data.user = {
        id: user.userId,
        role: user.role,
      };

      console.log(
        `User connected to socket. socketId=${socket.id}, userId=${user.userId}, role=${user.role}`,
      );
      next();
    } catch (error) {
      if (error instanceof AppError) {
        console.warn(
          `Socket auth failed for socketId=${socket.id}: ${error.message}`,
        );
        return next(error);
      } else {
        console.error("Unexpected error during socket auth:", error);
        return next(new AppError(401, "Unauthorized or token expired"));
      }
    }
  });

  io.on("connection", (socket) => {
    registerChatHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}