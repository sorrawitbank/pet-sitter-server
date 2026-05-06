import { Router } from "express";
import BookingController from "../controllers/booking.controller";
import ProtectMiddleware from "../middlewares/protect.middleware";
import BookingMiddleware from "../middlewares/booking.middleware";

const BookingRouter = Router();

BookingRouter.get(
  "/owner/history",
  [ProtectMiddleware.owner],
  BookingController.getOwnerBookingHistory,
);

BookingRouter.patch(
  "/:bookingId/time",
  [ProtectMiddleware.owner],
  [BookingMiddleware.updateBookingTime],
  BookingController.updateBookingTime,
);

BookingRouter.post(
  "/",
  [ProtectMiddleware.owner],
  BookingController.createBooking
);
export default BookingRouter;
