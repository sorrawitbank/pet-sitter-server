import { NextFunction, Request, Response } from "express";
import { GetReviewsQuery } from "../types/review";


const ReviewMiddleware = {
    getReviewsQuery: (
        req: Request<{}, {}, {}, GetReviewsQuery>,
        res: Response,
        next: NextFunction,
      ) => {
        const { page, limit, rating } = req.query;
        const parsedPage = Number(page);
        const parsedlimit = Number(limit);
        const parsedRating = Number(rating);

        if (
            !(
              (page === undefined ||
                (Number.isInteger(parsedPage) && parsedPage > 0)) &&
              (limit === undefined ||
                (Number.isInteger(parsedlimit) && parsedlimit > 0))
            )
          ) {
            return res.status(400).json({
              error: "Page and limit must be positive integers",
            });
          }

          if (parsedlimit > 20) {
            return res.status(400).json({
              error: "Limit must be less than or equal to 20",
            });
          }

          if (
            !(
              rating === undefined ||
              (Number.isInteger(parsedRating) &&
                parsedRating >= 1 &&
                parsedRating <= 5)
            )
          ) {
            return res.status(400).json({
              error: "Rating must be an integer between 1 and 5",
            });
          }

          next();

}
};

export default ReviewMiddleware