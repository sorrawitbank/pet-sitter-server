import db from "../db/db";
import { transactions, bookings, users } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";

const PaymentRepository = {
  insertTransaction: async (data: {
    bookingId: number;
    paymentMethod: "card" | "cash";
    status: "pending" | "paid" | "failed";
    referenceNo: string | null;
  }) => {
    const [result] = await db.insert(transactions).values(data).returning();
    return result;
  },

  updateTransactionStatus: async (
    referenceNo: string,
    status: "paid" | "failed",
    paidAt?: string,
  ) => {
    const [result] = await db
      .update(transactions)
      .set({ status, ...(paidAt ? { paidAt } : {}) })
      .where(eq(transactions.referenceNo, referenceNo))
      .returning();
    return result;
  },

  getTransactionByBookingId: async (bookingId: number) => {
    const [result] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.bookingId, bookingId))
      .limit(1);
    return result ?? null;
  },

  getPayoutSummary: async (petSitterId: number) => {
    const result = await db
      .select({
        transactionId: transactions.transactionId,
        paidAt: transactions.paidAt,
        amount: bookings.totalPrice,
        ownerName: users.name,
      })
      .from(transactions)
      .innerJoin(bookings, eq(transactions.bookingId, bookings.bookingId))
      .innerJoin(users, eq(bookings.petOwnerId, users.userId))
      .where(
        and(
          eq(bookings.petSitterId, petSitterId),
          eq(transactions.status, "paid"),
        ),
      )
      .orderBy(desc(transactions.paidAt));

    const totalEarning = result.reduce(
      (sum, row) => sum + Number(row.amount),
      0,
    );

    return { totalEarning, transactions: result };
  },
};

export default PaymentRepository;
