import { Router, raw } from "express";
import WebhookMiddleware from "../middlewares/webhook.middleware";
import PaymentController from "../controllers/payment.controller";

const WebHookRoute = Router();

WebHookRoute.post(
  "/",
  raw({ type: "application/json" }),
  WebhookMiddleware.verifyStripeSignature,
  PaymentController.handleWebhook,
);

export default WebHookRoute;
