import { format } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import sentenceToVector from "../chatbot/gemini/sentenceToVector";
import AppError from "../errors/AppError";
import DocumentRepository from "../repositories/document.repository";
import PetRepository from "../repositories/pet.repository";
import SitterRepository from "../repositories/sitter.repository";
import supabaseAdmin from "../supabase/admin";
import { DocumentMetadata } from "../types/chat";
import { SitterStatus } from "../types/sitter";
import { UserStatus } from "../types/user";
import buildSitterEmbeddingContents from "../utils/buildSitterEmbeddingContents";
import mergeItemsByOrder from "../utils/mergeItemsByOrder";

const bucket = "sitter-assets";
const DEFAULT_RADIUS = 5000;
const MAX_RADIUS = 100000;
const MIN_RESULTS = 5;

const SitterService = {
  getSitters: async (
    seed: string,
    page: number,
    limit: number,
    keyword: string | null,
    petType: string[] | null,
    rating: number | null,
    experience: number[] | null,
    hasPendingUpdate: boolean | null,
    status: SitterStatus | Extract<UserStatus, "Banned"> | null,
    canFilterByName: boolean = false,
    canFilterByEmail: boolean = false,
  ) => {
    const { result, totalPetSitters } = await SitterRepository.get(
      seed,
      page,
      limit,
      keyword,
      petType,
      rating,
      experience,
      hasPendingUpdate,
      status,
      canFilterByName,
      canFilterByEmail,
    );

    return {
      totalPetSitters,
      totalPages: Math.ceil(totalPetSitters / limit),
      petSitters: result.map((petSitter) => ({
        ...petSitter,
        sitter: {
          name: petSitter.user.name,
          profileImgUrl: petSitter.user.profileImgUrl,
          email: petSitter.user.email,
          status: petSitter.user.status,
        },
        petSitterImage: petSitter.petSitterImages[0]?.imgUrl ?? null,
        petTypes: petSitter.petSittersPetTypes.map(
          (petSitterPetType) => petSitterPetType.petType.name,
        ),
        province: petSitter.province?.name ?? null,
        district: petSitter.district?.name ?? null,
        latitude: petSitter.latitude ? Number(petSitter.latitude) : null,
        longitude: petSitter.longitude ? Number(petSitter.longitude) : null,
        ratingAvg: petSitter.ratingAvg ? Number(petSitter.ratingAvg) : null,
      })),
    };
  },

  getSittersByLocation: async (
    page: number,
    limit: number,
    keyword: string | null,
    petType: string[] | null,
    rating: number | null,
    experience: number[] | null,
    hasPendingUpdate: boolean | null,
    status: SitterStatus | Extract<UserStatus, "Banned"> | null,
    lat: number,
    lon: number,
    radius: number | null,
    canFilterByName: boolean = false,
    canFilterByEmail: boolean = false,
  ) => {
    let radiusUsed = radius ?? DEFAULT_RADIUS;
    let result = await SitterRepository.getByLocation(
      page,
      limit,
      keyword,
      petType,
      rating,
      experience,
      hasPendingUpdate,
      status,
      lat,
      lon,
      radiusUsed,
      canFilterByName,
      canFilterByEmail,
    );

    if (!radius && page === 1) {
      while (radiusUsed < MAX_RADIUS && result.totalPetSitters < MIN_RESULTS) {
        radiusUsed = Math.min(radiusUsed * 2, MAX_RADIUS);
        result = await SitterRepository.getByLocation(
          page,
          limit,
          keyword,
          petType,
          rating,
          experience,
          hasPendingUpdate,
          status,
          lat,
          lon,
          radiusUsed,
          canFilterByName,
          canFilterByEmail,
        );
      }
    }

    return {
      totalPetSitters: result.totalPetSitters,
      totalPages: Math.ceil(result.totalPetSitters / limit),
      petSitters: result.result.map((petSitter) => ({
        ...petSitter,
        sitter: {
          name: petSitter.user.name,
          profileImgUrl: petSitter.user.profileImgUrl,
          email: petSitter.user.email,
          status: petSitter.user.status,
        },
        petSitterImage: petSitter.petSitterImages[0]?.imgUrl ?? null,
        petTypes: petSitter.petSittersPetTypes.map(
          (petSitterPetType) => petSitterPetType.petType.name,
        ),
        province: petSitter.province?.name ?? null,
        district: petSitter.district?.name ?? null,
        latitude: petSitter.latitude ? Number(petSitter.latitude) : null,
        longitude: petSitter.longitude ? Number(petSitter.longitude) : null,
        ratingAvg: petSitter.ratingAvg ? Number(petSitter.ratingAvg) : null,
      })),
      radiusUsed,
      hasMore: page * limit < result.totalPetSitters,
    };
  },

  getSitterById: async (sitterId: number, onlyApproved: boolean = true) => {
    const result = await SitterRepository.getById(sitterId, onlyApproved);

    if (!result) {
      throw new AppError(404, "Sitter not found");
    }

    return {
      ...result,
      sitter: {
        id: result.user.userId,
        name: result.user.name,
        phone: result.user.phone,
        profileImgUrl: result.user.profileImgUrl,
        idNumber: result.user.idNumber,
        dateOfBirth: result.user.dateOfBirth,
        email: result.user.email,
        status: result.user.status,
      },
      petSitterImages: result.petSitterImages.map(
        (petSitterImage) => petSitterImage.imgUrl,
      ),
      petTypes: result.petSittersPetTypes.map(
        (petSitterPetType) => petSitterPetType.petType.name,
      ),
      province: result.province?.name ?? null,
      district: result.district?.name ?? null,
      subDistrict: result.subDistrict?.name ?? null,
      postCode: result.subDistrict?.postCode ?? null,
      experience: result.experience ? Number(result.experience) : null,
      latitude: result.latitude ? Number(result.latitude) : null,
      longitude: result.longitude ? Number(result.longitude) : null,
      ratingAvg: result.ratingAvg ? Number(result.ratingAvg) : null,
    };
  },

  getSitterByUserId: async (userId: string) => {
    const result = await SitterRepository.getByUserId(userId);

    if (!result) {
      throw new AppError(404, "Sitter not found for this user");
    }

    return {
      ...result,
      sitter: {
        name: result.user.name,
        phone: result.user.phone,
        profileImgUrl: result.user.profileImgUrl,
        idNumber: result.user.idNumber,
        dateOfBirth: result.user.dateOfBirth,
        email: result.user.email,
        status: result.user.status,
      },
      petSitterImages: result.petSitterImages.map(
        (petSitterImage) => petSitterImage.imgUrl,
      ),
      petTypes: result.petSittersPetTypes.map(
        (petSitterPetType) => petSitterPetType.petType.name,
      ),
      province: result.province?.name ?? null,
      district: result.district?.name ?? null,
      subDistrict: result.subDistrict?.name ?? null,
      postCode: result.subDistrict?.postCode ?? null,
      experience: result.experience ? Number(result.experience) : null,
      latitude: result.latitude ? Number(result.latitude) : null,
      longitude: result.longitude ? Number(result.longitude) : null,
      ratingAvg: result.ratingAvg ? Number(result.ratingAvg) : null,
    };
  },

  getPendingUpdateSitterById: async (sitterId: number) => {
    const result = await SitterRepository.getPendingUpdateById(sitterId);

    if (!result) {
      throw new AppError(404, "Sitter not found for this pending update");
    }

    return {
      ...result,
      petSitterImages: result.petSitterImagePendingUpdates.map(
        (petSitterImage) => petSitterImage.imgUrl,
      ),
      petTypes: result.petSittersPetTypesPendingUpdates.map(
        (petSitterPetType) => petSitterPetType.petType.name,
      ),
      province: result.province?.name ?? null,
      district: result.district?.name ?? null,
      subDistrict: result.subDistrict?.name ?? null,
      postCode: result.subDistrict?.postCode ?? null,
      experience: result.experience ? Number(result.experience) : null,
      latitude: result.latitude ? Number(result.latitude) : null,
      longitude: result.longitude ? Number(result.longitude) : null,
    };
  },

  pendingUpdateSitter: async (
    sitterId: number,
    experience: string | null | undefined,
    tradeName: string | null | undefined,
    petTypeIds: number[] | null | undefined,
    introduction: string | null | undefined,
    services: string | null | undefined,
    description: string | null | undefined,
    address: string | null | undefined,
    latitude: string | null | undefined,
    longitude: string | null | undefined,
    provinceId: number | null | undefined,
    districtId: number | null | undefined,
    subDistrictId: number | null | undefined,
    files: Express.Multer.File[] | undefined,
    existingImages: { url: string; order: number }[] | undefined,
  ) => {
    if ((files?.length ?? 0) + (existingImages?.length ?? 0) > 10) {
      throw new AppError(400, "Maximum number of images is 10");
    }

    const sitter = await SitterRepository.getById(sitterId, false);

    if (!sitter) {
      throw new AppError(404, "Sitter not found");
    }

    if (existingImages) {
      const imageUrls = sitter.petSitterImages.map((image) => image.imgUrl);
      existingImages.forEach((image) => {
        if (!imageUrls.includes(image.url)) {
          throw new AppError(400, "Image not found in sitter's current images");
        }
      });
    }

    const lookupPending = await SitterRepository.getPendingUpdateById(sitterId);

    if (lookupPending) {
      throw new AppError(400, "Sitter is already pending update");
    }

    if (petTypeIds) {
      const lookupPetTypeIds = (await PetRepository.getTypes()).map(
        (petType) => petType.petTypeId,
      );

      petTypeIds.forEach((petTypeId) => {
        if (!lookupPetTypeIds.includes(petTypeId)) {
          throw new AppError(404, "Pet type not found");
        }
      });
    }

    const lookupSitter = {
      byTradeName: tradeName
        ? await SitterRepository.getByTradeName(tradeName)
        : null,
      byPendingTradeName: tradeName
        ? await SitterRepository.getByPendingTradeName(tradeName)
        : null,
    };

    if (
      (lookupSitter.byTradeName &&
        lookupSitter.byTradeName.petSitterId !== sitterId) ||
      lookupSitter.byPendingTradeName
    ) {
      throw new AppError(400, "Sitter with this trade name already exists");
    }

    const filePaths: string[] = [];

    try {
      const publicUrls: string[] = [];
      let finalUrls: string[] | undefined = undefined;

      if (files || existingImages) {
        if (files) {
          const now = new UTCDate();

          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = file.mimetype.split("/")[1];

            const filePath = `${sitter.user.userId}/sitter-${format(
              now,
              "yyyyMMddHHmmss",
            )}-${i}.${ext}`;

            const { error } = await supabaseAdmin.storage
              .from(bucket)
              .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
              });

            if (error) {
              throw error;
            }

            filePaths.push(filePath);

            const { data } = supabaseAdmin.storage
              .from(bucket)
              .getPublicUrl(filePath);

            publicUrls.push(data.publicUrl);
          }
        }

        finalUrls = mergeItemsByOrder(
          existingImages ?? [],
          publicUrls.map((url) => ({ url: url })),
        ).map((url) => url.url);
      }

      await SitterRepository.pendingUpdate(
        sitterId,
        experience !== undefined ? experience : sitter.experience,
        tradeName !== undefined ? tradeName : sitter.tradeName,
        petTypeIds !== undefined
          ? petTypeIds
          : sitter.petSittersPetTypes.map(
              (petSitterPetType) => petSitterPetType.petType.petTypeId,
            ),
        introduction !== undefined ? introduction : sitter.introduction,
        services !== undefined ? services : sitter.services,
        description !== undefined ? description : sitter.description,
        address !== undefined ? address : sitter.address,
        latitude !== undefined ? latitude : sitter.latitude,
        longitude !== undefined ? longitude : sitter.longitude,
        provinceId !== undefined
          ? provinceId
          : (sitter.province?.provinceId ?? null),
        districtId !== undefined
          ? districtId
          : (sitter.district?.districtId ?? null),
        subDistrictId !== undefined
          ? subDistrictId
          : (sitter.subDistrict?.subDistrictId ?? null),
        finalUrls !== undefined
          ? finalUrls
          : sitter.petSitterImages.map((image) => image.imgUrl),
      );

      await SitterRepository.update(
        sitterId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        sitter.status !== "Approved" ? "Waiting for approval" : undefined,
        true,
        undefined,
        null,
      );
    } catch (error) {
      if (filePaths.length) {
        await supabaseAdmin.storage.from(bucket).remove(filePaths);
      }

      throw error;
    }
  },

  approveUpdateSitter: async (sitterId: number) => {
    const pendingSitter = await SitterRepository.getPendingUpdateById(sitterId);

    if (!pendingSitter) {
      throw new AppError(404, "Sitter not found for this pending update");
    }

    const sitter = await SitterRepository.getById(sitterId, false);

    if (!sitter) {
      throw new AppError(404, "Sitter not found");
    }

    const pendingSitterImages = pendingSitter.petSitterImagePendingUpdates.map(
      (image) => image.imgUrl,
    );

    const removedImages = sitter.petSitterImages
      .filter((image) => !pendingSitterImages.includes(image.imgUrl))
      .map((image) => image.imgUrl.split(`/${bucket}/`)[1]);

    const metadata: DocumentMetadata = {
      tradeName: pendingSitter.tradeName ?? undefined,
      provinceId: pendingSitter.province?.provinceId,
      districtId: pendingSitter.district?.districtId,
      petTypeIds: pendingSitter.petSittersPetTypesPendingUpdates.length
        ? pendingSitter.petSittersPetTypesPendingUpdates.map(
            (petSitterPetType) => petSitterPetType.petType.petTypeId,
          )
        : undefined,
    };

    const contents = buildSitterEmbeddingContents(
      pendingSitter.introduction,
      pendingSitter.services,
      pendingSitter.description,
    );

    const embeddings = await Promise.all(
      contents.map((content) => sentenceToVector(content)),
    );

    if (removedImages.length) {
      await supabaseAdmin.storage.from(bucket).remove(removedImages);
    }

    await SitterRepository.update(
      sitterId,
      pendingSitter.experience,
      pendingSitter.tradeName,
      pendingSitter.petSittersPetTypesPendingUpdates.map(
        (petSitterPetType) => petSitterPetType.petType.petTypeId,
      ),
      pendingSitter.introduction,
      pendingSitter.services,
      pendingSitter.description,
      pendingSitter.address,
      pendingSitter.latitude,
      pendingSitter.longitude,
      pendingSitter.province?.provinceId,
      pendingSitter.district?.districtId,
      pendingSitter.subDistrict?.subDistrictId,
      "Approved",
      false,
      pendingSitterImages,
      null,
    );

    await SitterRepository.deletePendingUpdate(sitterId);

    await DocumentRepository.deleteSitterDocument(sitterId);

    await DocumentRepository.createSitterDocument(
      sitterId,
      contents,
      embeddings,
      metadata,
    );
  },

  cancelUpdateSitter: async (
    sitterId: number,
    cancelBy: "sitter" | "admin",
    adminNote?: string,
  ) => {
    const pendingSitter = await SitterRepository.getPendingUpdateById(sitterId);

    if (!pendingSitter) {
      throw new AppError(404, "Sitter not found for this pending update");
    }

    const sitter = await SitterRepository.getById(sitterId, false);

    if (!sitter) {
      throw new AppError(404, "Sitter not found");
    }

    const sitterImages = sitter.petSitterImages.map((image) => image.imgUrl);

    const removedImages = pendingSitter.petSitterImagePendingUpdates
      .filter((pendingImage) => !sitterImages.includes(pendingImage.imgUrl))
      .map((image) => image.imgUrl.split(`/${bucket}/`)[1]);

    if (removedImages.length) {
      await supabaseAdmin.storage.from(bucket).remove(removedImages);
    }

    await SitterRepository.update(
      sitterId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      sitter.status !== "Approved"
        ? cancelBy === "admin"
          ? "Rejected"
          : "Unapproved"
        : undefined,
      false,
      undefined,
      cancelBy === "admin" ? (adminNote ?? null) : null,
    );

    await SitterRepository.deletePendingUpdate(sitterId);
  },

  deleteAdminReviewSitter: async (sitterId: number) => {
    const sitter = await SitterRepository.getById(sitterId, false);

    if (!sitter) {
      throw new AppError(404, "Sitter not found");
    }

    await SitterRepository.update(
      sitter.petSitterId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      null,
    );
  },

  banSitter: async (sitterId: number) => {
    const sitter = await SitterRepository.getById(sitterId, false);

    if (!sitter) {
      throw new AppError(404, "Sitter not found");
    }

    await DocumentRepository.deleteSitterDocument(sitter.petSitterId);
  },

  unbanSitter: async (sitterId: number) => {
    const sitter = await SitterRepository.getById(sitterId, false);

    if (!sitter) {
      throw new AppError(404, "Sitter not found");
    }

    const metadata: DocumentMetadata = {
      tradeName: sitter.tradeName ?? undefined,
      provinceId: sitter.province?.provinceId,
      districtId: sitter.district?.districtId,
      petTypeIds: sitter.petSittersPetTypes.length
        ? sitter.petSittersPetTypes.map(
            (petSitterPetType) => petSitterPetType.petType.petTypeId,
          )
        : undefined,
    };

    const contents = buildSitterEmbeddingContents(
      sitter.introduction,
      sitter.services,
      sitter.description,
    );

    const embeddings = await Promise.all(
      contents.map((content) => sentenceToVector(content)),
    );

    await DocumentRepository.createSitterDocument(
      sitter.petSitterId,
      contents,
      embeddings,
      metadata,
    );
  },
};

export default SitterService;
