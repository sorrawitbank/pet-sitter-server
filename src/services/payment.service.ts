import { stripe } from "../lib/stripe";
import PaymentRepository from "../repositories/payment.repository";
import BookingRepository from "../repositories/booking.repository";

const PaymentService = {
  createCardIntent: async (bookingId: number, amount: number) => {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "thb",
      metadata: { bookingId: String(bookingId) },
    });

    await PaymentRepository.insertTransaction({
      bookingId,
      paymentMethod: "card",
      status: "pending",
      referenceNo: paymentIntent.id,
    });

    return { clientSecret: paymentIntent.client_secret };
  },

  createCashTransaction: async (bookingId: number) => {
    return await PaymentRepository.insertTransaction({
      bookingId,
      paymentMethod: "cash",
      status: "pending",
      referenceNo: null,
    });
  },

  handlePaymentSucceeded: async (
    paymentIntentId: string,
    bookingId: number,
  ) => {
    await PaymentRepository.updateTransactionStatus(
      paymentIntentId,
      "paid",
      new Date().toISOString(),
    );
    await BookingRepository.updateBookingStatus(
      bookingId,
      "Waiting for service",
    );
  },

  handlePaymentFailed: async (paymentIntentId: string) => {
    await PaymentRepository.updateTransactionStatus(paymentIntentId, "failed");
  },

  getPayoutSummary: async (petSitterId: number) => {
    return await PaymentRepository.getPayoutSummary(petSitterId);
  },
};

export default PaymentService;
