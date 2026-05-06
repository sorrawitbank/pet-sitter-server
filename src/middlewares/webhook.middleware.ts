import { Request, Response, NextFunction } from "express";
import { stripe } from "../lib/stripe";
import Stripe from "stripe";

// extend Request type
declare global {
  namespace Express {
    interface Request {
      stripeEvent?: Stripe.Event;
    }
  }
}

const WebhookMiddleware = {
  verifyStripeSignature: (req: Request, res: Response, next: NextFunction) => {
    const sig = req.headers["stripe-signature"];

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig!,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
      req.stripeEvent = event; // แนบ event ไว้ใน request
      next();
    } catch (err) {
      console.error("Webhook signature failed:", err);
      res.status(400).send("Webhook Error");
    }
  },
};

export default WebhookMiddleware;
