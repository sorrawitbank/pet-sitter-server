import { Request, Response } from "express";
import AppError from "../errors/AppError";
import AuthService from "../services/auth.service";
import ReportService from "../services/report.service";

const ReportController = {
  createReport: async (req: Request, res: Response) => {
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

      const report = await ReportService.createReport({
        userId: authResult.user.userId,
        bookingId: req.body.booking_id,
        issue: req.body.issue,
        description: req.body.description,
      });

      return res.status(201).json({
        message: "Report created successfully",
        data: report,
      });
    } catch (error: any) {
      console.error("createReport error:", error);

      return res.status(error.statusCode || 500).json({
        error: error.message || "Internal Server Error",
      });
    }
  },
};

export default ReportController;