import { NextFunction, Request, Response } from "express";
import {
  AdminGetOwnersQuery,
  AdminGetSittersQuery,
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

  adminReviewSitterBody: (
    req: Request<{}, {}, Partial<RejectUpdateSitterBody>>,
    res: Response,
    next: NextFunction,
  ) => {
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
