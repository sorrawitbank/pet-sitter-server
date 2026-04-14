import "dotenv/config";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import AdminRoute from "./routes/admin.route";
import AuthRoute from "./routes/auth.route";
import OwnerRoute from "./routes/owner.route";
import PetRoute from "./routes/pet.route";
import SitterRoute from "./routes/sitter.route";
import AddressRoute from "./routes/address.route";
import BookingRoute from "./routes/booking.route";
import ReviewRoute from "./routes/review.route";
import ChatRoute from "./routes/chat.route";
import Reportroute from "./routes/report.route";
import WebHookRoute from "./routes/webhook.route";
import PaymentRoute from "./routes/payment.route";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000", // Frontend local (Next.js)
      "https://pet-sitter-app-two.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

app.use(express.json());

app.get("/", (req, res) => {
  return res.status(200).json("Welcome to Pet Sitter Server");
});

app.get("/health", (req, res) => {
  return res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.use("/api/auth", AuthRoute);
app.use("/api/pet", PetRoute);
app.use("/api/pet-owner", OwnerRoute);
app.use("/api/pet-sitter", SitterRoute);
app.use("/api/admin", AdminRoute);
app.use("/api/address", AddressRoute);
app.use("/api/bookings", BookingRoute);
app.use("/api/reviews", ReviewRoute);
app.use("/api/chat", ChatRoute);
app.use("/api/reports", Reportroute);
app.use("/api/payment", PaymentRoute);
app.use("/api/webhook/stripe", WebHookRoute);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err) {
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || "Something went wrong",
    });
  }

  next();
});

export default app;
