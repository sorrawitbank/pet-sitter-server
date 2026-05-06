import { Request, Response, NextFunction } from "express";
import BookingService from "../services/booking.service";
import AppError from "../errors/AppError";
import AuthService from "../services/auth.service";
import SitterService from "../services/sitter.service";
import {
  GetAvailableHoursBooking,
  GetBookingListsQuery,
  GetBookingsInDateRangeQuery,
  RequestWithUser,
  UpdateBookingTimeRequest,
} from "../types/booking";
import { SitterIdParams } from "../types/sitter";
import parsePositiveInt from "../utils/parsePositiveInt";
import { formatTime, toThailandDateTime, toUTC7 } from "../utils/time";

const BookingController = {
  createBooking: async (
    req: RequestWithUser,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = req.user!.id;

      const {
        pet_sitter_id,
        contact_name,
        contact_email,
        contact_phone,
        start_time,
        end_time,
        total_price,
        note,
        pet_ids,
      } = req.body;

      if (
        !pet_sitter_id ||
        !contact_name ||
        !contact_email ||
        !contact_phone ||
        !start_time ||
        !end_time ||
        !total_price
      ) {
        return res.status(400).json({
          message: "Missing required fields",
        });
      }

      const result = await BookingService.createBooking(userId, {
        pet_sitter_id,
        contact_name,
        contact_email,
        contact_phone,
        start_time,
        end_time,
        total_price,
        note,
        pet_ids,
      });

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  getBookingLists: async (req: RequestWithUser, res: Response) => {
    try {
      const userId = req.user!.id;
      const keyword = (req.query.keyword as string) || "";

      const currentPage = parsePositiveInt(req.query.page, 1);
      const limit = parsePositiveInt(req.query.limit, 10, 20);

      const allowedStatuses = [
        "waiting_confirm",
        "waiting_service",
        "in_service",
        "completed",
        "canceled",
      ] as const;

      const rawStatus = (req.query.status as string) || "";
      const status =
        rawStatus.toLowerCase() === "all" ||
        !allowedStatuses.includes(rawStatus as any)
          ? ""
          : rawStatus;
      const query: GetBookingListsQuery = {
        keyword,
        status,
        currentPage,
        limit,
      };

      const { bookings, total, totalPages } =
        await BookingService.getBookingLists(userId, query);

      const response = {
        totalPages: totalPages,
        currentPage: currentPage,
        limit: limit,
        total: total,
        bookings,
      };
      return res.status(200).json(response);
    } catch (error: any) {
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getBookingById: async (req: RequestWithUser, res: Response) => {
    try {
      const bookingId = Number(req.params.bookingId);
      const userId = req.user!.id;

      const result = await BookingService.getBookingById(bookingId, userId);

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  },

  getOwnerBookingHistory: async (req: RequestWithUser, res: Response) => {
    try {
      const userId = req.user!.id;
      const result = await BookingService.getOwnerBookingHistory(userId);
      return res.status(200).json(result);
    } catch (error) {
      console.error("getOwnerBookingHistory:", error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  getAvailableHoursBooking: async (
    req: Request<SitterIdParams, {}, {}, GetAvailableHoursBooking>,
    res: Response,
  ) => {
    const sitterId = Number(req.params.sitterId);
    const { date, exceptedBookingId } = req.query;
    let result;

    try {
      const sitter = await SitterService.getSitterById(sitterId);

      result = await BookingService.getBookingLists(sitter.sitter.id, {
        startDate: toThailandDateTime(date, false),
        endDate: toThailandDateTime(date, true),
      });
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    // Generate all time slots (00:00 - 23:30)
    const allSlots = [];
    for (let h = 0; h < 24; h++) {
      for (let m of [0, 30]) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        allSlots.push(`${hh}:${mm}`);
      }
    }

    const unavailable = new Set();

    const activeBookings = result.bookings.filter(
      (b) =>
        b.status !== "Canceled" &&
        (exceptedBookingId === undefined ||
          b.bookingId !== Number(exceptedBookingId)),
    );

    for (const booking of activeBookings) {
      const start = toUTC7(booking.startTime);
      const end = toUTC7(booking.endTime);

      let current = new Date(start);

      while (current < end) {
        const timeStr = formatTime(current);
        unavailable.add(timeStr);

        // add 30 minutes
        current = new Date(current.getTime() + 30 * 60 * 1000);
      }
    }

    const availableSlots = allSlots.filter((slot) => !unavailable.has(slot));

    return res.status(200).json({ availableSlots });
  },

  getBookingsInDateRange: async (
    req: Request<{}, {}, {}, GetBookingsInDateRangeQuery>,
    res: Response,
  ) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    const { start, end } = req.query;

    const startDate = toThailandDateTime(start, false);

    const endDate = toThailandDateTime(end, true);

    let result;

    try {
      const user = await AuthService.getUser(token);
      result = await BookingService.getBookingLists(user.data.user.id, {
        startDate,
        endDate,
        limit: 999,
      });
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    const bookingsResponse = result.bookings.map((booking) => ({
      id: booking.bookingId,
      ownerName: booking.contactName,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
    }));

    return res.status(200).json({ bookings: bookingsResponse });
  },

  updateBookingStatus: async (req: RequestWithUser, res: Response) => {
    try {
      const bookingId = Number(req.params.bookingId);
      const { status } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const result = await BookingService.updateBookingStatus(
        bookingId,
        status,
        userId,
      );

      return res.status(200).json({ data: result });
    } catch (error: unknown) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  updateBookingTime: async (req: UpdateBookingTimeRequest, res: Response) => {
    try {
      const bookingId = Number(req.params.bookingId);
      const { startTime, endTime } = req.body;

      const updated = await BookingService.updateBookingTime({
        bookingId,
        startTime,
        endTime,
      });

      if (!updated) {
        return res.status(404).json({ message: "Booking not found" });
      }

      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  },
};

export default BookingController;
