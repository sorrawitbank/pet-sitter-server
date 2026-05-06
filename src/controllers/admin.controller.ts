import { format } from "date-fns";
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import BookingService from "../services/booking.service";
import OwnerService from "../services/owner.service";
import ReviewService from "../services/review.service";
import ReportService from "../services/report.service";
import SitterService from "../services/sitter.service";
import UserService from "../services/user.service";
import {
  AdminGetOwnersQuery,
  AdminGetSittersQuery,
  GetSitterBookingsOrReviewsQuery,
  RejectUpdateSitterBody,
} from "../types/admin";
import { BookingIdParams } from "../types/booking";
import { SitterIdParams } from "../types/sitter";
import { UserIdParams } from "../types/user";
import {
  AdminGetReportsQuery,
  AllowedReportStatus,
  ReportStatus,
} from "../types/report";
import parsePositiveInt from "../utils/parsePositiveInt";

const AdminController = {
  getOwners: async (
    req: Request<{}, {}, {}, AdminGetOwnersQuery>,
    res: Response,
  ) => {
    const seed = req.query.seed || format(new Date(), "yyyyMMdd");
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 8;
    const keyword = req.query.keyword ? req.query.keyword.trim() : null;
    const status = req.query.status || null;
    let result;

    try {
      result = await OwnerService.getOwners(seed, page, limit, keyword, status);
    } catch {
      return res.status(500).json({ error: "Internal server error" });
    }

    const ownersResponse = {
      totalOwners: result.totalOwners,
      totalPages: result.totalPages,
      currentPage: page,
      limit: limit,
      owners: result.petOwners.map((petOwner) => ({
        id: petOwner.userId,
        name: petOwner.name,
        phone: petOwner.phone,
        profileImgUrl: petOwner.profileImgUrl,
        email: petOwner.email,
        status: petOwner.status,
        petCount: petOwner.petCount,
      })),
    };

    return res.status(200).json(ownersResponse);
  },

  getOwnerByUserId: async (req: Request<UserIdParams>, res: Response) => {
    const userId = req.params.userId;
    let result;

    try {
      result = await OwnerService.getOwnerByUserId(userId);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    const ownerResponse = {
      id: result.userId,
      name: result.name,
      phone: result.phone,
      profileImgUrl: result.profileImgUrl,
      idNumber: result.idNumber,
      dateOfBirth: result.dateOfBirth,
      email: result.email,
      status: result.status,
      pets: result.pets,
    };

    return res.status(200).json(ownerResponse);
  },

  getSitters: async (
    req: Request<{}, {}, {}, AdminGetSittersQuery>,
    res: Response,
  ) => {
    const seed = req.query.seed || format(new Date(), "yyyyMMdd");
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 8;
    const keyword = req.query.keyword ? req.query.keyword.trim() : null;
    const petType = req.query.pet_type ? req.query.pet_type.split(",") : null;
    const rating = Number(req.query.rating) || null;
    const status = req.query.status || null;
    const hasPendingUpdate =
      req.query.hasPendingUpdate !== undefined
        ? req.query.hasPendingUpdate.toLowerCase() === "true"
          ? true
          : req.query.hasPendingUpdate.toLowerCase() === "false"
            ? false
            : Number(req.query.hasPendingUpdate) ||
                Number(req.query.hasPendingUpdate) === 0
              ? Boolean(Number(req.query.hasPendingUpdate))
              : null
        : null;
    let experience: number[] | null;
    let result;

    if (req.query.experience) {
      experience = req.query.experience.split("-").map(Number);
      if (req.query.experience.endsWith("-")) {
        experience[1] = Infinity;
      } else {
        experience.sort((a, b) => a - b);
      }
    } else {
      experience = null;
    }

    try {
      result = await SitterService.getSitters(
        seed,
        page,
        limit,
        keyword,
        petType,
        rating,
        experience,
        hasPendingUpdate,
        status,
        true,
        true,
      );
    } catch {
      return res.status(500).json({ error: "Internal server error" });
    }

    const sittersResponse = {
      totalSitters: result.totalPetSitters,
      totalPages: result.totalPages,
      currentPage: page,
      limit: limit,
      sitters: result.petSitters.map((petSitter: any) => ({
        id: petSitter.petSitterId,
        sitter: petSitter.sitter,
        tradeName: petSitter.tradeName,
        hasPendingUpdate: petSitter.hasPendingUpdate,
        status: petSitter.status,
      })),
    };

    return res.status(200).json(sittersResponse);
  },

  getSitterById: async (req: Request<SitterIdParams>, res: Response) => {
    const sitterId = Number(req.params.sitterId);
    let result;

    try {
      result = await SitterService.getSitterById(sitterId, false);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    const sitterResponse = {
      id: result.petSitterId,
      sitter: result.sitter,
      imgUrls: result.petSitterImages,
      tradeName: result.tradeName,
      experience: result.experience,
      petTypes: result.petTypes,
      introduction: result.introduction,
      services: result.services,
      description: result.description,
      address: result.address,
      latitude: result.latitude,
      longitude: result.longitude,
      province: result.province,
      district: result.district,
      subDistrict: result.subDistrict,
      postCode: result.postCode,
      hasPendingUpdate: result.hasPendingUpdate,
      status: result.status,
      adminNote: result.adminNote,
    };

    return res.status(200).json(sitterResponse);
  },

  getPendingUpdateSitterById: async (
    req: Request<SitterIdParams>,
    res: Response,
  ) => {
    const sitterId = Number(req.params.sitterId);
    let result;
    let user;

    try {
      result = await SitterService.getPendingUpdateSitterById(sitterId);

      user = await UserService.getPendingUpdateUserById(result.userId);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    const { name, phone, profileImgUrl, idNumber, dateOfBirth } = user;

    const sitterResponse = {
      id: result.petSitterId,
      sitter: { name, phone, profileImgUrl, idNumber, dateOfBirth },
      imgUrls: result.petSitterImages,
      tradeName: result.tradeName,
      experience: result.experience,
      petTypes: result.petTypes,
      introduction: result.introduction,
      services: result.services,
      description: result.description,
      address: result.address,
      latitude: result.latitude,
      longitude: result.longitude,
      province: result.province,
      district: result.district,
      subDistrict: result.subDistrict,
      postCode: result.postCode,
    };

    return res.status(200).json(sitterResponse);
  },

  getBookingsBySitterId: async (
    req: Request<SitterIdParams, {}, {}, GetSitterBookingsOrReviewsQuery>,
    res: Response,
  ) => {
    const sitterId = Number(req.params.sitterId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    let result;

    try {
      const sitter = await SitterService.getSitterById(sitterId, false);

      result = await BookingService.getBookingLists(sitter.sitter.id, {
        currentPage: page,
        limit,
      });
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    const bookingsResponse = {
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      limit: result.limit,
      total: result.total,
      bookings: result.bookings,
    };

    return res.status(200).json(bookingsResponse);
  },

  getBookingById: async (req: Request<BookingIdParams>, res: Response) => {
    const bookingId = Number(req.params.bookingId);
    let result;

    try {
      result = await BookingService.getBookingById(bookingId);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    const pets = result.pets.map((pet) => ({
      id: pet.bookingPetId,
      petName: pet.petName,
      petType: pet.petType,
      imgUrl: pet.imgUrl,
    }));

    const bookingResponse = {
      ...result,
      pets,
    };

    return res.status(200).json(bookingResponse);
  },

  getReviewsBySitterId: async (
    req: Request<SitterIdParams, {}, {}, GetSitterBookingsOrReviewsQuery>,
    res: Response,
  ) => {
    const sitterId = Number(req.params.sitterId);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    let result;

    try {
      result = await ReviewService.getReviewsBySitterId(
        sitterId,
        page,
        limit,
        null,
      );
    } catch (error) {
      // Client error from service
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

  approveUpdateSitter: async (req: Request<SitterIdParams>, res: Response) => {
    const sitterId = Number(req.params.sitterId);

    try {
      const sitter = await SitterService.getSitterById(sitterId, false);

      await UserService.approveUpdateUser(sitter.sitter.id);

      await SitterService.approveUpdateSitter(sitterId);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    return res.status(200).json({ message: "Update approved successfully" });
  },

  rejectUpdateSitter: async (
    req: Request<SitterIdParams, {}, RejectUpdateSitterBody>,
    res: Response,
  ) => {
    const sitterId = Number(req.params.sitterId);
    const { adminNote } = req.body;

    try {
      const sitter = await SitterService.getSitterById(sitterId, false);

      await UserService.cancelUpdateUser(sitter.sitter.id);

      await SitterService.cancelUpdateSitter(sitterId, "admin", adminNote);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    return res.status(200).json({ message: "Update rejected successfully" });
  },

  banUser: async (req: Request<UserIdParams>, res: Response) => {
    const userId = req.params.userId;

    try {
      const role = (await UserService.getUserById(userId)).role;

      if (role === "sitter") {
        const sitter = await SitterService.getSitterByUserId(userId);

        await SitterService.banSitter(sitter.petSitterId);
      }

      await UserService.updateUser(
        userId,
        undefined,
        undefined,
        undefined,
        undefined,
        "Banned",
        undefined,
      );
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    return res.status(200).json({ message: "User banned successfully" });
  },

  unbanUser: async (req: Request<UserIdParams>, res: Response) => {
    const userId = req.params.userId;

    try {
      const role = (await UserService.getUserById(userId)).role;

      if (role === "sitter") {
        const sitter = await SitterService.getSitterByUserId(userId);

        SitterService.unbanSitter(sitter.petSitterId);
      }

      await UserService.updateUser(
        userId,
        undefined,
        undefined,
        undefined,
        undefined,
        "Normal",
        undefined,
      );
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    return res.status(200).json({ message: "User unbanned successfully" });
  },

  getReports: async (req: Request, res: Response) => {
    try {
      const currentPage = parsePositiveInt(req.query?.page, 1);
      const limit = parsePositiveInt(req.query?.limit, 10, 20);

      const rawStatus = (req.query.status as string) || "";
      const status =
        rawStatus.toLowerCase() === "all" ||
        !AllowedReportStatus.includes(rawStatus)
          ? ""
          : rawStatus;
      const query: AdminGetReportsQuery = {
        status: status as ReportStatus,
        currentPage: currentPage as number,
        limit: limit as number,
      };

      const result = await ReportService.getAllReports(query);
      return res.status(200).json(result);
    } catch (error) {
      // Client error from service
      console.error("getReports error:", error);
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }
  },

  getReportByIdForAdmin: async (
    req: Request<{ reportId: string }>,
    res: Response,
  ) => {
    const reportId = req.params.reportId;
    try {
      const checkingStatusReport = await ReportService.getReportByIdForAdmin(
        reportId,
      );
      if (checkingStatusReport.data[0]?.status === "New Report") {
        await ReportService.patchReportStatusByIdForAdmin(reportId, "Pending");
      }
      const result = await ReportService.getReportByIdForAdmin(reportId);
      return res.status(200).json(result);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  patchReportStatusByIdForAdmin: async (
    req: Request<{ reportId: string }>,
    res: Response,
  ) => {
    const reportId = req.params.reportId;
    const status = req.body.status as ReportStatus;
    try {
      const result = await ReportService.patchReportStatusByIdForAdmin(
        reportId,
        status,
      );
      return res.status(200).json(result);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};

export default AdminController;
