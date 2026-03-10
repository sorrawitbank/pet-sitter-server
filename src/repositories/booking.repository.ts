import { eq } from "drizzle-orm";
import db from "../db/db";
import { bookingPets } from "../db/schema";

export const getBookingById = async (bookingId: number) => {
  const booking = await db.query.bookings.findFirst({
    where: (bookings, { eq }) => eq(bookings.bookingId, bookingId),
  });

  if (!booking) return null;

  const pets = await db
    .select()
    .from(bookingPets)
    .where(eq(bookingPets.bookingId, bookingId));

  return { ...booking, pets };
};
