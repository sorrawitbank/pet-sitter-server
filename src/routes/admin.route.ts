import { Router } from "express";
import AdminController from "../controllers/admin.controller";
import AdminMiddleware from "../middlewares/admin.middleware";
import BookingMiddleware from "../middlewares/booking.middleware";
import OwnerMiddleware from "../middlewares/owner.middleware";
import ProtectMiddleware from "../middlewares/protect.middleware";
import SitterMiddleware from "../middlewares/sitter.middleware";
import UserMiddleware from "../middlewares/user.middleware";

const AdminRoute = Router();

AdminRoute.get(
  "/pet-owner",
  [
    AdminMiddleware.getOwnersQuery,
    OwnerMiddleware.getOwnersQuery,
    ProtectMiddleware.admin,
  ],
  AdminController.getOwners,
);

AdminRoute.get(
  "/pet-owner/:userId",
  [UserMiddleware.userId, ProtectMiddleware.admin],
  AdminController.getOwnerByUserId,
);

AdminRoute.get(
  "/pet-sitter",
  [
    AdminMiddleware.getSittersQuery,
    SitterMiddleware.getSittersQuery,
    ProtectMiddleware.admin,
  ],
  AdminController.getSitters,
);

AdminRoute.get(
  "/pet-sitter/:sitterId",
  [SitterMiddleware.sitterId, ProtectMiddleware.admin],
  AdminController.getSitterById,
);

AdminRoute.get(
  "/pet-sitter/pending-update/:sitterId",
  [SitterMiddleware.sitterId, ProtectMiddleware.admin],
  AdminController.getPendingUpdateSitterById,
);

AdminRoute.get(
  "/pet-sitter/bookings/:sitterId",
  [
    SitterMiddleware.sitterId,
    AdminMiddleware.getSitterBookingsOrReviewsQuery,
    ProtectMiddleware.admin,
  ],
  AdminController.getBookingsBySitterId,
);

AdminRoute.get(
  "/pet-sitter/booking/:bookingId",
  [BookingMiddleware.bookingId, ProtectMiddleware.admin],
  AdminController.getBookingById,
);

AdminRoute.get(
  "/pet-sitter/reviews/:sitterId",
  [
    SitterMiddleware.sitterId,
    AdminMiddleware.getSitterBookingsOrReviewsQuery,
    ProtectMiddleware.admin,
  ],
  AdminController.getReviewsBySitterId,
);

AdminRoute.get(
  "/reports",
  [ProtectMiddleware.admin],
  AdminController.getReports,
);

AdminRoute.get(
  "/reports/:reportId",
  [ProtectMiddleware.admin],
  AdminController.getReportByIdForAdmin,
);

AdminRoute.patch(
  "/ban/:userId",
  [UserMiddleware.userId, ProtectMiddleware.admin],
  AdminController.banUser,
);

AdminRoute.patch(
  "/unban/:userId",
  [UserMiddleware.userId, ProtectMiddleware.admin],
  AdminController.unbanUser,
);

AdminRoute.patch(
  "/pet-sitter/approve/:sitterId",
  [SitterMiddleware.sitterId, ProtectMiddleware.admin],
  AdminController.approveUpdateSitter,
);

AdminRoute.patch(
  "/pet-sitter/reject/:sitterId",
  [
    SitterMiddleware.sitterId,
    AdminMiddleware.reviewSitterBody,
    ProtectMiddleware.admin,
  ],
  AdminController.rejectUpdateSitter,
);

AdminRoute.patch(
  "/reports/:reportId/status",
  [ProtectMiddleware.admin],
  AdminController.patchReportStatusByIdForAdmin,
);

export default AdminRoute;
