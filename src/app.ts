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

app.use("/api/webhook/stripe", WebHookRoute);

app.use(express.json());

app.get("/", (req, res) => {
  return res.status(200).json("Welcome to Pet Sitter Server");
});

app.get("/health", (req, res) => {
  return res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.use("/auth", AuthRoute);
app.use("/pet", PetRoute);
app.use("/pet-owner", OwnerRoute);
app.use("/pet-sitter", SitterRoute);
app.use("/admin", AdminRoute);
app.use("/address", AddressRoute);
app.use("/bookings", BookingRoute);
app.use("/reviews", ReviewRoute);
app.use("/chat", ChatRoute);
app.use("/reports", Reportroute);
app.use("/api/payment", PaymentRoute);

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
