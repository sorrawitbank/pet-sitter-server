import SitterRepository from "../repositories/sitter.repository";
import AppError from "../errors/AppError";
import BookingRepository from "../repositories/booking.repository";
import { GetBookingListsQuery, UpdateBookingTimeInput } from "../types/booking";
import { formatDurationLabel, getDurationMinutes } from "../utils/duration";
import formatBookingRange from "../utils/formatBookingRange";

const BookingService = {
  createBooking: async (userId: string, data: any) => {
    if (new Date(data.end_time) <= new Date(data.start_time)) {
      throw new Error("End time must be after start time");
    }

    return await BookingRepository.createBooking({
      petOwnerId: userId,
      petSitterId: data.pet_sitter_id,
      contactName: data.contact_name,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      startTime: data.start_time,
      endTime: data.end_time,
      totalPrice: data.total_price,
      note: data.note,
      petIds: data.pet_ids,
    });
  },
  getBookings: async (loggedInUserId: string) => {
    const petSitter = await SitterRepository.getByUserId(loggedInUserId);
    if (!petSitter) throw new AppError(404, "Pet sitter not found");

    const bookings = await BookingRepository.getBookings({
      petSitterId: petSitter.petSitterId,
    }); //return [] (No booking)

    return bookings.map((booking) => ({
      bookingId: booking.bookingId,
      status: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
      totalPrice: booking.totalPrice,
      contactName: booking.contactName,
      contactPhone: booking.contactPhone,
      contactEmail: booking.contactEmail,
      note: booking.note,
    }));
  },
  getBookingLists: async (
    loggedInUserId: string,
    query?: GetBookingListsQuery,
  ) => {
    const petSitter = await SitterRepository.getByUserId(loggedInUserId);
    if (!petSitter) throw new AppError(404, "Pet sitter not found");

    const { bookings, total } = await BookingRepository.getBookingLists(
      {
        petSitterId: petSitter.petSitterId,
      },
      query,
    ); //return [] (No booking)
    const mappedBookings = bookings.map((booking) => {
      const durationMinutes = getDurationMinutes(
        booking.bookings.startTime,
        booking.bookings.endTime,
      );
      const label = formatBookingRange(
        booking.bookings.startTime,
        booking.bookings.endTime,
      );

      return {
        bookingId: booking.bookings.bookingId,
        petOwnerName: booking.users.name,
        petCount: booking.petCount,
        status: booking.bookings.status,
        startTime: booking.bookings.startTime,
        endTime: booking.bookings.endTime,
        bookingDate: label,
        duration: formatDurationLabel(durationMinutes),
        totalPrice: booking.bookings.totalPrice,
        contactName: booking.bookings.contactName,
        contactPhone: booking.bookings.contactPhone,
        contactEmail: booking.bookings.contactEmail,
        note: booking.bookings.note,
      };
    });
    const limit = query?.limit ?? 10;
    const currentPage = query?.currentPage ?? 1;
    const totalPages = Math.ceil(total / limit);

    return {
      bookings: mappedBookings,
      total,
      totalPages,
      currentPage,
      limit,
    };
  },

  getBookingById: async (bookingId: number, loggedInUserId: string) => {
    const booking = await BookingRepository.getBookingById(bookingId);

    if (!booking) {
      throw new AppError(404, "Booking not found");
    }

    const petSitter = await SitterRepository.getByUserId(loggedInUserId);
    if (!petSitter) throw new AppError(404, "Pet sitter not found");

    const lookupBookings = await BookingRepository.getBookings({
      petSitterId: petSitter.petSitterId,
    });
    const lookupBookingIds = lookupBookings.map((b) => b.bookingId);

    if (!lookupBookingIds.includes(bookingId)) {
      throw new AppError(404, "Booking not found or not owned by this sitter");
    }

    const durationMinutes = getDurationMinutes(
      booking.startTime,
      booking.endTime,
    );

    return {
      bookingId: booking.bookingId,
      status: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: formatDurationLabel(durationMinutes),
      totalPrice: booking.totalPrice,
      contactName: booking.contactName,
      contactPhone: booking.contactPhone,
      contactEmail: booking.contactEmail,
      note: booking.note,
      // Pet owner info
      petOwnerName: booking.petOwnerName,
      petOwnerEmail: booking.petOwnerEmail,
      petOwnerPhone: booking.petOwnerPhone,
      petOwnerDateOfBirth: booking.petOwnerDateOfBirth,
      petOwnerProfileImg: booking.petOwnerProfileImg,
      // Pets with type and image
      pets: booking.pets,
    };
  },

  getOwnerBookingHistory: async (loggedInUserId: string) => {
    const bookings = await BookingRepository.getBookings({
      petOwnerId: loggedInUserId,
    });

    return Promise.all(
      bookings.map(async (booking) => {
        const full = await BookingRepository.getBookingById(booking.bookingId);
        const durationMinutes = getDurationMinutes(
          booking.startTime,
          booking.endTime,
        );
        return {
          bookingId: booking.bookingId,
          status: booking.status,
          startTime: booking.startTime,
          endTime: booking.endTime,
          duration: formatDurationLabel(durationMinutes),
          totalPrice: booking.totalPrice,
          contactName: booking.contactName,
          contactPhone: booking.contactPhone,
          contactEmail: booking.contactEmail,
          createdAt: booking.createdAt,
          petSitterId: booking.petSitterId,
          note: booking.note,
          tradeName: full?.tradeName ?? null,
          sitterName: full?.sitterName ?? null,
          sitterImgUrl: full?.sitterImgUrl ?? null,
          sitterPhone: full?.sitterPhone ?? null,
          pets: full?.pets ?? [],
          review: full?.review ?? null,
        };
      }),
    );
  },

  updateBookingStatus: async (
    bookingId: number,
    status: string,
    loggedInUserId: string,
  ) => {
    const petSitter = await SitterRepository.getByUserId(loggedInUserId);
    if (!petSitter) throw new AppError(404, "Pet sitter not found");

    const lookupBookings = await BookingRepository.getBookings({
      petSitterId: petSitter.petSitterId,
    });
    const lookupBookingIds = lookupBookings.map((b) => b.bookingId);

    if (!lookupBookingIds.includes(bookingId)) {
      throw new AppError(404, "Booking not found or not owned by this sitter");
    }

    const updated = await BookingRepository.updateBookingStatus(
      bookingId,
      status,
    );
    if (!updated) throw new AppError(500, "Failed to update booking status");

    return updated;
  },

  updateBookingTime: async ({
    bookingId,
    startTime,
    endTime,
  }: UpdateBookingTimeInput) => {
    return BookingRepository.updateBookingTime(bookingId, startTime, endTime);
  },
};

export default BookingService;
