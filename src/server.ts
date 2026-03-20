import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import initSocket from "./socket/index";

const PORT = process.env.PORT || 4000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://pet-sitter-app-two.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

initSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 