import { Request, Response } from "express";
import PaymentService from "../services/payment.service";

const PaymentController = {
  createIntent: async (req: Request, res: Response) => {
    try {
      const { bookingId, amount } = req.body;
      const result = await PaymentService.createCardIntent(
        Number(bookingId),
        Number(amount),
      );
      res.json(result);
    } catch (error) {
      console.error("createIntent error:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  },

  createCash: async (req: Request, res: Response) => {
    try {
      const { bookingId } = req.body;
      const result = await PaymentService.createCashTransaction(
        Number(bookingId),
      );
      res.json(result);
    } catch (error) {
      console.error("createCash error:", error);
      res.status(500).json({ error: "Failed to create cash transaction" });
    }
  },

  handleWebhook: async (req: Request, res: Response) => {
    const event = req.stripeEvent!; // ได้จาก middleware

    try {
      switch (event.type) {
        case "payment_intent.succeeded": {
          const pi = event.data.object;
          const bookingId = parseInt(pi.metadata.bookingId);
          await PaymentService.handlePaymentSucceeded(pi.id, bookingId);
          console.log(`Payment succeeded — bookingId: ${bookingId}`);
          break;
        }

        case "payment_intent.payment_failed": {
          const pi = event.data.object;
          await PaymentService.handlePaymentFailed(pi.id);
          console.log(`Payment failed — intentId: ${pi.id}`);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
          break;
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook handler error:", err);
      res.status(500).send("Internal Server Error");
    }
  },

  getPayoutSummary: async (req: Request, res: Response) => {
    try {
      const petSitterId = Number(req.params.petSitterId);
      const result = await PaymentService.getPayoutSummary(petSitterId);
      res.json(result);
    } catch (error) {
      console.error("getPayoutSummary error:", error);
      res.status(500).json({ error: "Failed to get payout summary" });
    }
  },
};

export default PaymentController;
