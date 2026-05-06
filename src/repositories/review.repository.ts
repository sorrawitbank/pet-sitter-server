import { and, count, desc, eq, inArray } from "drizzle-orm";
import db from "../db/db";
import { bookings, reviews } from "../db/schema";

const ReviewRepository = {
  getBySitterId: async (
    sitterId: number,
    page: number,
    limit: number,
    rating: number | null
  ) => {
    const offset = (page - 1) * limit;

    const bookingIdsResult = await db
      .select({ bookingId: bookings.bookingId })
      .from(bookings)
      .where(eq(bookings.petSitterId, sitterId));

    const bookingIds = bookingIdsResult.map((row) => row.bookingId);
    if (bookingIds.length === 0) {
      return { result: [], totalReviews: 0 };
    }

    const filters = [inArray(reviews.bookingId, bookingIds)];
    if (rating !== null && rating !== undefined) {
      filters.push(eq(reviews.rating, rating));
    }
    const whereClause = and(...filters);

    const result = await db.query.reviews.findMany({
      columns: {
        reviewId: true,
        bookingId: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
      with: {
        booking: {
          columns: { bookingId: true, petOwnerId: true },
          with: {
            user: {
              columns: {
                userId: true,
                name: true,
                profileImgUrl: true,
              },
            },
          },
        },
      },
      where: whereClause,
      orderBy: [desc(reviews.createdAt)],
      limit,
      offset,
    });

    const countResult = await db
      .select({ total: count() })
      .from(reviews)
      .where(whereClause);

    const totalReviews = countResult[0].total;

    return { result, totalReviews };
  },
  createReview: async (payload: {
    bookingId: number;
    rating: number;
    comment: string;
  }) => {
    const [review] = await db
      .insert(reviews)
      .values({
        bookingId: payload.bookingId,
        rating: payload.rating,
        comment: payload.comment,
      })
      .returning();

    return review;
  },

  findReviewByBookingId: async (bookingId: number) => {
    const review = await db.query.reviews.findFirst({
      where: (reviews, { eq }) => eq(reviews.bookingId, bookingId),
    });

    return review;
  },

  findAccessibleBookingById: async (bookingId: number, userId: string) => {
    const booking = await db.query.bookings.findFirst({
      where: (bookings, { and, eq }) =>
        and(
          eq(bookings.bookingId, bookingId),
          eq(bookings.petOwnerId, userId),
        ),
    });

    return booking;
  },

};

export default ReviewRepository;
