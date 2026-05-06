import { Router } from "express";
import PaymentController from "../controllers/payment.controller";
import ProtectMiddleware from "../middlewares/protect.middleware";

const PaymentRoute = Router();

PaymentRoute.post("/create-intent", PaymentController.createIntent);
PaymentRoute.post("/create-cash", PaymentController.createCash);
PaymentRoute.get(
  "/payout-summary/:petSitterId",
  ProtectMiddleware.sitter,
  PaymentController.getPayoutSummary,
);

export default PaymentRoute;
