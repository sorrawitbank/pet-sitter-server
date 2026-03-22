import { eq, and, ilike, count, or, desc, between } from "drizzle-orm";
import db from "../db/db";
import {
  bookings,
  bookingsPets,
  petSitters,
  pets,
  petTypes,
  users,
  transactions,
} from "../db/schema";
import {
  GetBookingListsQuery,
  GetBookingsFilter,
  STATUS_OPTIONS,
} from "../types/booking";
import { formatDurationLabel, getDurationMinutes } from "../utils/duration";
import type { CreateBookingInput } from "../types/booking";

import { inArray } from "drizzle-orm";

const BookingRepository = {
  createBooking: async (data: CreateBookingInput) => {
    return await db.transaction(async (tx) => {
      const [booking] = await tx
        .insert(bookings)
        .values({
          petOwnerId: data.petOwnerId,
          petSitterId: data.petSitterId,
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          startTime: data.startTime,
          endTime: data.endTime,
          totalPrice: data.totalPrice.toString(),
          note: data.note ?? null,
        })
        .returning();

      if (data.petIds?.length) {
        const petList = await tx
          .select()
          .from(pets)
          .where(inArray(pets.petId, data.petIds));

        await tx.insert(bookingsPets).values(
          petList.map((pet) => ({
            bookingId: booking.bookingId,
            petId: pet.petId,
            petTypeId: pet.petTypeId,
            petName: pet.petName,
            sex: pet.sex,
            breed: pet.breed,
            dateOfBirth: pet.dateOfBirth,
            color: pet.color,
            weight: pet.weight,
            about: pet.about ?? null,
          })),
        );
      }

      return booking;
    });
  },

  getBookings: async (filter: GetBookingsFilter) => {
    const conditions = [];

    if (filter.petSitterId) {
      conditions.push(eq(bookings.petSitterId, filter.petSitterId));
    }

    if (filter.petOwnerId) {
      conditions.push(eq(bookings.petOwnerId, filter.petOwnerId));
    }

    const result = await db
      .select()
      .from(bookings)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return result;
  },

  getBookingLists: async (
    filter: GetBookingsFilter,
    query?: GetBookingListsQuery,
  ) => {
    const conditions = [];
    const keywordConditions = [];
    const statusConditions = [];
    const rangeConditions = [];

    if (filter.petSitterId) {
      conditions.push(eq(bookings.petSitterId, filter.petSitterId));
    }

    if (filter.petOwnerId) {
      conditions.push(eq(bookings.petOwnerId, filter.petOwnerId));
    }

    if (query?.keyword) {
      keywordConditions.push(ilike(users.name, `%${query.keyword}%`));
    }

    if (query?.status) {
      const useStatus = STATUS_OPTIONS.find(
        (status: { value: string }) => status.value === query.status,
      );
      if (useStatus) {
        statusConditions.push(eq(bookings.status, useStatus?.label as any));
      }
    }

    if (query?.startDate && query?.endDate) {
      rangeConditions.push(
        between(bookings.startTime, query.startDate, query.endDate),
      );
    }

    const offset = ((query?.currentPage ?? 1) - 1) * (query?.limit ?? 10);

    const whereClause = and(
      ...(conditions.length > 0 ? [and(...conditions)] : []),
      ...(keywordConditions.length > 0 ? [or(...keywordConditions)] : []),
      ...(statusConditions.length > 0 ? [and(...statusConditions)] : []),
      ...rangeConditions,
    );

    const totalResult = await db
      .select({ total: count() })
      .from(bookings)
      .where(whereClause);
    const total = totalResult[0]?.total ?? 0;

    const result = await db
      .select({
        bookings,
        users,
        petCount: count(pets.petId).as("petCount"),
      })
      .from(bookings)
      .innerJoin(users, eq(users.userId, bookings.petOwnerId))
      .leftJoin(pets, eq(pets.userId, bookings.petOwnerId))
      .where(whereClause)
      .groupBy(bookings.bookingId, users.userId)
      .limit(query?.limit ?? 10)
      .offset(offset)
      .orderBy(desc(bookings.updatedAt));

    return { bookings: result, total };
  },

  getBookingById: async (bookingId: number) => {
    const booking = await db.query.bookings.findFirst({
      where: (bookings, { eq }) => eq(bookings.bookingId, bookingId),
    });

    if (!booking) return null;

    const bookingPets = await db
      .select({
        bookingPetId: bookingsPets.bookingPetId,
        bookingId: bookingsPets.bookingId,
        petId: bookingsPets.petId,
        petTypeId: bookingsPets.petTypeId,
        petType: petTypes.name,
        petName: bookingsPets.petName,
        sex: bookingsPets.sex,
        breed: bookingsPets.breed,
        dateOfBirth: bookingsPets.dateOfBirth,
        color: bookingsPets.color,
        weight: bookingsPets.weight,
        about: bookingsPets.about,
        imgUrl: pets.imgUrl,
      })
      .from(bookingsPets)
      .leftJoin(pets, eq(bookingsPets.petId, pets.petId))
      .innerJoin(petTypes, eq(bookingsPets.petTypeId, petTypes.petTypeId))
      .where(eq(bookingsPets.bookingId, bookingId));

    const review = await db.query.reviews.findFirst({
      where: (reviews, { eq }) => eq(reviews.bookingId, bookingId),
    });

    const sitter = await db
      .select({
        tradeName: petSitters.tradeName,
        sitterName: users.name,
        sitterImgUrl: users.profileImgUrl,
        sitterPhone: users.phone,
        latitude: petSitters.latitude,
        longitude: petSitters.longitude,
      })
      .from(petSitters)
      .innerJoin(users, eq(users.userId, petSitters.userId))
      .where(eq(petSitters.petSitterId, booking.petSitterId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    const petOwner = await db
      .select({
        petOwnerName: users.name,
        petOwnerEmail: users.email,
        petOwnerPhone: users.phone,
        petOwnerDateOfBirth: users.dateOfBirth,
        petOwnerProfileImg: users.profileImgUrl,
      })
      .from(users)
      .where(eq(users.userId, booking.petOwnerId))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    return {
      ...booking,
      pets: bookingPets,
      review: review ?? null,
      tradeName: sitter?.tradeName ?? null,
      sitterName: sitter?.sitterName ?? null,
      sitterImgUrl: sitter?.sitterImgUrl ?? null,
      sitterPhone: sitter?.sitterPhone ?? null,
      petOwnerName: petOwner?.petOwnerName ?? null,
      petOwnerEmail: petOwner?.petOwnerEmail ?? null,
      petOwnerPhone: petOwner?.petOwnerPhone ?? null,
      petOwnerDateOfBirth: petOwner?.petOwnerDateOfBirth ?? null,
      petOwnerProfileImg: petOwner?.petOwnerProfileImg ?? null,
      latitude: sitter?.latitude ?? null,
      longitude: sitter?.longitude ?? null,
    };
  },

  updateBookingStatus: async (bookingId: number, status: string) => {
    return await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(bookings)
        .set({
          status: status as any,
          updatedAt: new Date().toISOString(),
          completedAt:
            status === "Success" ? new Date().toISOString() : undefined,
        })
        .where(eq(bookings.bookingId, bookingId))
        .returning();

      if (status === "Success") {
        await tx
          .update(transactions)
          .set({
            status: "paid",
            paidAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(transactions.bookingId, bookingId),
              eq(transactions.paymentMethod, "cash"),
            ),
          );
      }

      return updated ?? null;
    });
  },

  updateBookingTime: async (
    bookingId: number,
    startTime: string,
    endTime: string,
  ) => {
    const booking = await db.query.bookings.findFirst({
      where: (bookings, { eq }) => eq(bookings.bookingId, bookingId),
    });

    if (!booking) return null;

    const durationMinutes = getDurationMinutes(startTime, endTime);
    const duration = formatDurationLabel(durationMinutes);

    const [updated] = await db
      .update(bookings)
      .set({
        startTime,
        endTime,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(bookings.bookingId, bookingId))
      .returning();

    return { ...updated, duration };
  },
};

export default BookingRepository;
