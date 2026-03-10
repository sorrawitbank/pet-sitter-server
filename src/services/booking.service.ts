import { getBookingById } from "../repositories/booking.repository";
import SitterRepository from "../repositories/sitter.repository";

export const getBookingByIdService = async (
  bookingId: number,
  loggedInUserId: string, //JWT token****
) => {
  const booking = await getBookingById(bookingId);

  if (!booking) {
    throw new Error("Booking not found");
  }

  const petSitter = await SitterRepository.getByUserId(loggedInUserId);
  if (!petSitter) throw new Error("Pet sitter not found");

  if (booking.petSitterId !== petSitter.petSitterId) {
    throw new Error("Forbidden: You don't own this booking");
  }

  return {
    bookingId: booking.bookingId,
    status: booking.status,
    startTime: booking.startTime,
    endTime: booking.endTime,
    totalPrice: booking.totalPrice,
    contactName: booking.contactName,
    contactPhone: booking.contactPhone,
    contactEmail: booking.contactEmail,
    note: booking.note,
    pets: booking.pets,
  };
};
