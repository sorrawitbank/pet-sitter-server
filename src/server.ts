import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";
import initSocket from "./socket";
import { setSocketServer } from "./socket/io";

const PORT = process.env.PORT || 4000;

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000", // Frontend local (Next.js)
      "https://pet-sitter-app-two.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

setSocketServer(io);
initSocket(io);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
