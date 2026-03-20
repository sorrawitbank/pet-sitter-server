import { NextFunction, Request, Response } from "express";
import {
  BookingIdParams,
  GetBookingsInDateRangeQuery,
  UpdateBookingTimeBody,
  UpdateBookingTimeParams,
} from "../types/booking";
import { dateRegex } from "../utils/regex";

const BookingMiddleware = {
  bookingId: (
    req: Request<BookingIdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    const bookingId = req.params.bookingId;
    const parsedBookingId = Number(bookingId);

    if (!Number.isInteger(parsedBookingId) || parsedBookingId <= 0) {
      return res.status(400).json({
        error: "Pet ID must be a positive integer",
      });
    }

    next();
  },

  getBookingInRangeQuery: (
    req: Request<{}, {}, {}, Partial<GetBookingsInDateRangeQuery>>,
    res: Response,
    next: NextFunction,
  ) => {
    const { start, end } = req.query;

    // Check for required fields
    if (!start) {
      return res.status(400).json({ error: "Start Date is required" });
    }

    if (!end) {
      return res.status(400).json({ error: "End Date is required" });
    }

    // Type validations
    if (!dateRegex.test(start)) {
      return res.status(400).json({ error: "Invalid start date" });
    }

    const parsedStartDate = new Date(start);
    if (Number.isNaN(parsedStartDate.getTime())) {
      return res.status(400).json({ error: "Invalid start date" });
    }

    if (!dateRegex.test(end)) {
      return res.status(400).json({ error: "Invalid end date" });
    }

    const parsedEndDate = new Date(end);
    if (Number.isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ error: "Invalid end date" });
    }

    if (parsedStartDate > parsedEndDate) {
      return res.status(400).json({
        error: "Start date must be before end date",
      });
    }

    next();
  },

  updateBookingTime: (
    req: Request<UpdateBookingTimeParams, unknown, UpdateBookingTimeBody>,
    res: Response,
    next: NextFunction,
  ) => {
    const { startTime, endTime } = req.body;
    const { bookingId } = req.params;

    if (!bookingId || isNaN(Number(bookingId))) {
      return res.status(400).json({ message: "Invalid bookingId" });
    }

    if (!startTime || !endTime) {
      return res
        .status(400)
        .json({ message: "startTime and endTime are required" });
    }

    if (isNaN(Date.parse(startTime)) || isNaN(Date.parse(endTime))) {
      return res.status(400).json({ message: "Invalid timestamp format" });
    }

    if (new Date(endTime) <= new Date(startTime)) {
      return res
        .status(400)
        .json({ message: "endTime must be after startTime" });
    }

    next();
  },
};

export default BookingMiddleware;
