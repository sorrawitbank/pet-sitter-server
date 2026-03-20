import AppError from "../errors/AppError";
import ReviewRepository from "../repositories/review.repository";
import SitterRepository from "../repositories/sitter.repository";

const ReviewService = {
  getReviewsBySitterId: async (
    sitterId: number,
    page: number,
    limit: number,
    rating: number | null,
  ) => {
    const sitter = await SitterRepository.getById(sitterId, false);

    if (!sitter) {
      throw new AppError(404, "Sitter not found");
    }

    const { result, totalReviews } = await ReviewRepository.getBySitterId(
      sitterId,
      page,
      limit,
      rating,
    );

    return {
      totalReviews,
      totalPages: Math.ceil(totalReviews / limit),
      reviews: result.map((review) => ({
        reviewId: review.reviewId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        reviewer: {
          name: review.booking.user.name,
          profileImgUrl: review.booking.user.profileImgUrl,
        },
      })),
    };
  },

  createReview: async ({
    userId,
    bookingId,
    rating,
    comment,
  }: {
    userId: string;
    bookingId: number;
    rating: number;
    comment: string;
  }) => {
    const normalizedBookingId = Number(bookingId);
    const normalizedRating = Number(rating);
    const trimmedComment = String(comment ?? "").trim();

    if (!normalizedBookingId || !normalizedRating || !trimmedComment) {
      throw new AppError(400, "booking_id, rating and comment are required");
    }

    if (
      !Number.isInteger(normalizedRating) ||
      normalizedRating < 1 ||
      normalizedRating > 5
    ) {
      throw new AppError(400, "Rating must be between 1 and 5");
    }

    const booking = await ReviewRepository.findAccessibleBookingById(
      normalizedBookingId,
      userId,
    );

    if (!booking) {
      throw new AppError(404, "Booking not found or not accessible");
    }

    if (booking.status !== "Success") {
      throw new AppError(400, "You can only review completed bookings");
    }

    const existingReview = await ReviewRepository.findReviewByBookingId(
      normalizedBookingId,
    );

    if (existingReview) {
      throw new AppError(409, "This booking has already been reviewed");
    }

    const review = await ReviewRepository.createReview({
      bookingId: normalizedBookingId,
      rating: normalizedRating,
      comment: trimmedComment,
    });

    return review;
  },
};

export default ReviewService;
