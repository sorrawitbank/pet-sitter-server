import { Request, Response } from "express";
import AppError from "../errors/AppError";
import ReviewService from "../services/review.service";
import { GetReviewsQuery } from "../types/review";
import { SitterIdParams } from "../types/sitter";
import AuthService from "../services/auth.service";

const ReviewController = {
  getReviewsBySitterId: async (
    req: Request<SitterIdParams, {}, {}, GetReviewsQuery>,
    res: Response,
  ) => {
    const sitterId = Number(req.params.sitterId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const rating = Number(req.query.rating) || null;
    let result;

    try {
      result = await ReviewService.getReviewsBySitterId(
        sitterId,
        page,
        limit,
        rating,
      );
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    const reviewsResponse = {
      totalReviews: result.totalReviews,
      totalPages: result.totalPages,
      currentPage: page,
      limit: limit,
      reviews: result.reviews.map((review) => ({
        id: review.reviewId,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt,
        reviewer: review.reviewer,
      })),
    };

    return res.status(200).json(reviewsResponse);
  },
  
  createReview: async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new AppError(401, "Authorization header missing");
      }

      const token = authHeader.split(" ")[1];

      if (!token) {
        throw new AppError(401, "Invalid authorization header");
      }

      const authResult = await AuthService.getUser(token);

      const review = await ReviewService.createReview({
        userId: authResult.user.userId,
        bookingId: req.body.booking_id,
        rating: req.body.rating,
        comment: req.body.comment,
      });

      return res.status(201).json({
        message: "Review created successfully",
        data: review,
      });
    } catch (error: any) {
      console.error("createReview error:", error);

      return res.status(error.status || 500).json({
        error: error.message || "Internal Server Error",
      });
    }
  },
};

export default ReviewController;
