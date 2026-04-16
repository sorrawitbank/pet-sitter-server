import { NextFunction, Request, Response } from "express";
import {
  AdminGetOwnersQuery,
  AdminGetSittersQuery,
  GetSitterBookingsOrReviewsQuery,
  RejectUpdateSitterBody,
} from "../types/admin";
import { SITTER_STATUS } from "../types/sitter";
import { USER_STATUS } from "../types/user";

const AdminMiddleware = {
  getOwnersQuery: (
    req: Request<{}, {}, {}, AdminGetOwnersQuery>,
    res: Response,
    next: NextFunction,
  ) => {
    const { status } = req.query;

    if (status !== undefined && !USER_STATUS.includes(status)) {
      return res.status(400).json({ error: "Invalid user status" });
    }

    next();
  },

  getSittersQuery: (
    req: Request<{}, {}, {}, AdminGetSittersQuery>,
    res: Response,
    next: NextFunction,
  ) => {
    const { status } = req.query;

    if (
      status !== undefined &&
      !(status === "Banned" || SITTER_STATUS.includes(status))
    ) {
      return res.status(400).json({ error: "Invalid sitter status" });
    }

    next();
  },

  getSitterBookingsOrReviewsQuery: (
    req: Request<{}, {}, {}, GetSitterBookingsOrReviewsQuery>,
    res: Response,
    next: NextFunction,
  ) => {
    const { page, limit } = req.query;
    const parsedPage = Number(page);
    const parsedlimit = Number(limit);

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

    next();
  },

  reviewSitterBody: (
    req: Request<{}, {}, Partial<RejectUpdateSitterBody>>,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.body) {
      return res.status(400).json({ error: "Body is required" });
    }

    const { adminNote } = req.body;

    if (!adminNote) {
      return res.status(400).json({
        error: "Admin note is required when rejecting a sitter",
      });
    }

    if (typeof adminNote !== "string") {
      return res.status(400).json({
        error: "Admin note must be a string",
      });
    }

    if (adminNote.trim().length < 10) {
      return res.status(400).json({
        error: "Admin note must be at least 10 characters long",
      });
    }

    if (adminNote.trim().length > 500) {
      return res.status(400).json({
        error: "Admin note must be less than 500 characters",
      });
    }

    next();
  },
};

export default AdminMiddleware;
