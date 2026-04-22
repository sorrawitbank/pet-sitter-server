import { Router } from "express";
import SitterController from "../controllers/sitter.controller";
import BookingMiddleware from "../middlewares/booking.middleware";
import ProtectMiddleware from "../middlewares/protect.middleware";
import SitterMiddleware from "../middlewares/sitter.middleware";
import UploadMiddleware from "../middlewares/upload.middleware";
import UserMiddleware from "../middlewares/user.middleware";
import ReviewMiddleware from "../middlewares/review.middleware";
import ReviewController from "../controllers/review.controller";
import BookingController from "../controllers/booking.controller";

const SitterRoute = Router();

SitterRoute.get(
  "/",
  [SitterMiddleware.getSittersQuery],
  SitterController.getSitters,
);

SitterRoute.get(
  "/profile",
  [ProtectMiddleware.sitter],
  SitterController.getSitterProfile,
);

SitterRoute.get(
  "/bookings",
  [ProtectMiddleware.sitter],
  BookingController.getBookingLists,
);

SitterRoute.get(
  "/bookings/available-hours/:sitterId",
  [SitterMiddleware.sitterId, BookingMiddleware.getAvailableHoursBooking],
  BookingController.getAvailableHoursBooking,
);

SitterRoute.get(
  "/bookings/range",
  [BookingMiddleware.getBookingInRangeQuery, ProtectMiddleware.sitter],
  BookingController.getBookingsInDateRange,
);

SitterRoute.get(
  "/bookings/:bookingId",
  [ProtectMiddleware.sitter],
  BookingController.getBookingById,
);

SitterRoute.get(
  "/:sitterId",
  [SitterMiddleware.sitterId],
  SitterController.getSitterById,
);

SitterRoute.get(
  "/:sitterId/reviews",
  [SitterMiddleware.sitterId, ReviewMiddleware.getReviewsQuery],
  ReviewController.getReviewsBySitterId,
);

SitterRoute.put(
  "/profile",
  [
    UploadMiddleware.uploadSitterProfile,
    UserMiddleware.updateUserBody,
    SitterMiddleware.updateSitterBody,
    ProtectMiddleware.sitter,
  ],
  SitterController.updateSitter,
);

SitterRoute.patch(
  "/booking/:bookingId/status",
  [ProtectMiddleware.sitter],
  BookingController.updateBookingStatus,
);

SitterRoute.delete(
  "/profile/cancel",
  [ProtectMiddleware.sitter],
  SitterController.cancelUpdateSitter,
);

SitterRoute.delete(
  "/note",
  [ProtectMiddleware.sitter],
  SitterController.deleteAdminReviewSitter,
);

export default SitterRoute;
