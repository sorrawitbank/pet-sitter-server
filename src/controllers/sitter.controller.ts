import { format } from "date-fns";
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import AuthService from "../services/auth.service";
import SitterService, {
  getSittersByLocation,
} from "../services/sitter.service";
import UserService from "../services/user.service";
import {
  GetSittersQuery,
  SitterIdParams,
  UpdateSitterBody,
} from "../types/sitter";
import { UpdateUserBody } from "../types/user";

const SitterController = {
  getSitters: async (
    req: Request<{}, {}, {}, GetSittersQuery>,
    res: Response,
  ) => {
    const seed = req.query.seed || format(new Date(), "yyyyMMdd");
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const keyword = req.query.keyword ? req.query.keyword.trim() : null;
    const petType = req.query.pet_type ? req.query.pet_type.split(",") : null;
    const rating = Number(req.query.rating) || null;
    const lat = req.query.lat !== undefined ? Number(req.query.lat) : null;
    const lon = req.query.lon !== undefined ? Number(req.query.lon) : null;
    const radius =
      req.query.radius !== undefined ? Number(req.query.radius) : null;
    const isLocationSearch = lat !== null && lon !== null;
    let experience: number[] | null;
    let result:
      | Awaited<ReturnType<typeof SitterService.getSitters>>
      | Awaited<ReturnType<typeof getSittersByLocation>>;
    let locationMeta: Awaited<ReturnType<typeof getSittersByLocation>> | null =
      null;

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
      if (!isLocationSearch) {
        result = await SitterService.getSitters(
          seed,
          page,
          limit,
          keyword,
          petType,
          rating,
          experience,
          null,
          "Approved",
        );
      } else {
        locationMeta = await getSittersByLocation(
          page,
          limit,
          keyword,
          petType,
          rating,
          experience,
          null,
          "Approved",
          lat,
          lon,
          radius,
        );
        result = locationMeta;
      }
    } catch (error) {
      console.error("getSitters failed", error);
      return res.status(500).json({ error: "Internal server error" });
    }

    const sittersResponse = {
      totalPetSitters: result.totalPetSitters,
      totalPages: result.totalPages,
      currentPage: page,
      limit: limit,
      sitters: result.petSitters.map((petSitter) => {
        const { name, profileImgUrl } = petSitter.sitter;

        return {
          id: petSitter.petSitterId,
          sitter: { name, profileImgUrl },
          imgUrl: petSitter.petSitterImage,
          tradeName: petSitter.tradeName,
          rating: petSitter.ratingAvg,
          petTypes: petSitter.petTypes,
          latitude: petSitter.latitude,
          longitude: petSitter.longitude,
          province: petSitter.province,
          district: petSitter.district,
        };
      }),
      ...(isLocationSearch && locationMeta
        ? {
            meta: {
              radiusUsed: locationMeta.radiusUsed,
              hasMore: locationMeta.hasMore,
            },
          }
        : {}),
    };

    return res.status(200).json(sittersResponse);
  },

  getSitterById: async (req: Request<SitterIdParams>, res: Response) => {
    const sitterId = Number(req.params.sitterId);
    let result;

    try {
      result = await SitterService.getSitterById(sitterId);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    const { name, profileImgUrl } = result.sitter;

    const sitterResponse = {
      id: result.petSitterId,
      sitter: { name, profileImgUrl },
      imgUrls: result.petSitterImages,
      tradeName: result.tradeName,
      experience: result.experience,
      reviewCount: result.reviewCount,
      rating: result.ratingAvg,
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

  getSitterProfile: async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    let result;

    try {
      const user = await AuthService.getUser(token);

      result = await SitterService.getSitterByUserId(user.data.user.id);
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
      reviewCount: result.reviewCount,
      rating: result.ratingAvg,
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

  updateSitter: async (
    req: Request<{}, {}, { body: string }>,
    res: Response,
  ) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    const body: UpdateUserBody & UpdateSitterBody = JSON.parse(req.body.body);

    const {
      name,
      phone,
      idNumber,
      dateOfBirth,
      removeProfileImg,
      experience,
      tradeName,
      petTypeIds,
      introduction,
      services,
      description,
      address,
      latitude,
      longitude,
      provinceId,
      districtId,
      subDistrictId,
      existingImages,
    } = body;

    const uploaded = req.files as
      | { profileImage?: Express.Multer.File[]; images?: Express.Multer.File[] }
      | undefined;
    const profileImageFile = uploaded?.profileImage?.[0];
    const galleryFiles = uploaded?.images?.length ? uploaded.images : undefined;

    try {
      const user = await AuthService.getUser(token);

      const sitter = await SitterService.getSitterByUserId(user.data.user.id);

      await UserService.pendingUpdateUser(
        user.data.user.id,
        typeof name === "string" ? name.trim() : name,
        phone,
        idNumber,
        dateOfBirth,
        profileImageFile,
        Boolean(removeProfileImg),
      );

      try {
        await SitterService.pendingUpdateSitter(
          sitter.petSitterId,
          typeof experience === "number" ? String(experience) : experience,
          typeof tradeName === "string" ? tradeName.trim() : tradeName,
          petTypeIds,
          typeof introduction === "string" ? introduction.trim() : introduction,
          typeof services === "string" ? services.trim() : services,
          typeof description === "string" ? description.trim() : description,
          typeof address === "string" ? address.trim() : address,
          typeof latitude === "number" ? String(latitude) : latitude,
          typeof longitude === "number" ? String(longitude) : longitude,
          provinceId,
          districtId,
          subDistrictId,
          galleryFiles,
          existingImages,
        );
      } catch (error) {
        // Rollback
        await UserService.cancelUpdateUser(user.data.user.id);

        throw error;
      }
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    return res.status(200).json({ message: "Updated successfully" });
  },

  cancelUpdateSitter: async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    try {
      const user = await AuthService.getUser(token);

      const sitter = await SitterService.getSitterByUserId(user.data.user.id);

      await UserService.cancelUpdateUser(user.data.user.id);

      await SitterService.cancelUpdateSitter(sitter.petSitterId, "sitter");
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    return res.status(200).json({ message: "Cancelled successfully" });
  },

  deleteAdminReviewSitter: async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Token missing" });
    }

    try {
      const user = await AuthService.getUser(token);

      const sitter = await SitterService.getSitterByUserId(user.data.user.id);

      await SitterService.deleteAdminReviewSitter(sitter.petSitterId);
    } catch (error) {
      // Client error from service
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }

      return res.status(500).json({ error: "Internal server error" });
    }

    return res.status(200).json({
      message: "Deleted Admin Review successfully",
    });
  },
};

export default SitterController;
