import { format } from "date-fns";
import { UTCDate } from "@date-fns/utc";
import sentenceToVector from "../chatbot/gemini/sentenceToVector";
import AppError from "../errors/AppError";
import DocumentRepository from "../repositories/document.repository";
import PetRepository from "../repositories/pet.repository";
import SitterRepository from "../repositories/sitter.repository";
import supabaseClient from "../supabase/client";
import { DocumentMetadata } from "../types/chat";
import { SitterStatus } from "../types/sitter";
import { UserStatus } from "../types/user";
import buildSitterEmbeddingContents from "../utils/buildSitterEmbeddingContents";
import mergeItemsByOrder from "../utils/mergeItemsByOrder";

const bucket = "sitter-assets";
const DEFAULT_RADIUS = 5000; // meters — starting search radius when none is specified
const MAX_RADIUS = 100000; // meters — hard cap on radius expansion
const MIN_RESULTS = 5; // minimum sitters before radius expansion stops

const SitterService = {
  // Returns paginated sitter list with optional filters (keyword, pet type, rating, etc.)
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
      // Flatten nested DB relations into a clean response shape
      petSitters: result.map((petSitter) => ({
        ...petSitter,
        sitter: {
          name: petSitter.user.name,
          profileImgUrl: petSitter.user.profileImgUrl,
          email: petSitter.user.email,
          status: petSitter.user.status,
        },
        petSitterImage: petSitter.petSitterImages[0]?.imgUrl ?? null, // Only first image for list view
        petTypes: petSitter.petSittersPetTypes.map((p) => p.petType.name),
        province: petSitter.province?.name ?? null,
        district: petSitter.district?.name ?? null,
        latitude: petSitter.latitude ? Number(petSitter.latitude) : null,
        longitude: petSitter.longitude ? Number(petSitter.longitude) : null,
        ratingAvg: petSitter.ratingAvg ? Number(petSitter.ratingAvg) : null,
      })),
    };
  },

  // Like getSitters but filters by proximity; auto-expands radius if too few results are found
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
    radius: number | null, // null = use auto-expanding radius
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

    // Only expand radius on page 1 when no explicit radius was given
    if (!radius && page === 1) {
      // Double radius each iteration until we hit MIN_RESULTS or MAX_RADIUS
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
        petTypes: petSitter.petSittersPetTypes.map((p) => p.petType.name),
        province: petSitter.province?.name ?? null,
        district: petSitter.district?.name ?? null,
        latitude: petSitter.latitude ? Number(petSitter.latitude) : null,
        longitude: petSitter.longitude ? Number(petSitter.longitude) : null,
        ratingAvg: petSitter.ratingAvg ? Number(petSitter.ratingAvg) : null,
      })),
      radiusUsed, // Let client know how far the search actually reached
      hasMore: page * limit < result.totalPetSitters,
    };
  },

  // Fetches full sitter detail by sitter ID; throws 404 if not found
  getSitterById: async (sitterId: number, onlyApproved: boolean = true) => {
    const result = await SitterRepository.getById(sitterId, onlyApproved);

    if (!result) throw new AppError(404, "Sitter not found");

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
      petSitterImages: result.petSitterImages.map((img) => img.imgUrl),
      petTypes: result.petSittersPetTypes.map((p) => p.petType.name),
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

  // Fetches full sitter detail by user ID (for owner's own profile lookup)
  getSitterByUserId: async (userId: string) => {
    const result = await SitterRepository.getByUserId(userId);

    if (!result) throw new AppError(404, "Sitter not found for this user");

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
      petSitterImages: result.petSitterImages.map((img) => img.imgUrl),
      petTypes: result.petSittersPetTypes.map((p) => p.petType.name),
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

  // Fetches the sitter's pending update snapshot alongside their current approved profile
  getPendingUpdateSitterById: async (sitterId: number) => {
    const result = await SitterRepository.getPendingUpdateById(sitterId);
    if (!result)
      throw new AppError(404, "Sitter not found for this pending update");

    const sitter = await SitterRepository.getById(sitterId, false);
    if (!sitter) throw new AppError(404, "Sitter not found");

    return {
      ...result,
      userId: sitter.user.userId,
      petSitterImages: result.petSitterImagePendingUpdates.map(
        (img) => img.imgUrl,
      ),
      petTypes: result.petSittersPetTypesPendingUpdates.map(
        (p) => p.petType.name,
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

  // Submits a profile update for admin review (creates a pending update record)
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
    if (!sitter) throw new AppError(404, "Sitter not found");

    // Ensure retained images actually belong to this sitter
    if (existingImages) {
      const imageUrls = sitter.petSitterImages.map((image) => image.imgUrl);
      existingImages.forEach((image) => {
        if (!imageUrls.includes(image.url))
          throw new AppError(400, "Image not found in sitter's current images");
      });
    }

    // Block duplicate pending updates
    if (await SitterRepository.getPendingUpdateById(sitterId)) {
      throw new AppError(400, "Sitter is already pending update");
    }

    // Validate all submitted pet type IDs exist
    if (petTypeIds) {
      const validIds = (await PetRepository.getTypes()).map((p) => p.petTypeId);
      petTypeIds.forEach((id) => {
        if (!validIds.includes(id))
          throw new AppError(404, "Pet type not found");
      });
    }

    // Ensure trade name isn't already taken (by another sitter or in another pending update)
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

    const filePaths: string[] = []; // Track uploaded paths for rollback on error

    try {
      const publicUrls: string[] = [];
      let finalUrls: string[] | undefined = undefined;

      if (files || existingImages) {
        if (files) {
          const now = new UTCDate();

          // Upload each new image to Supabase storage with a timestamped path
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = file.mimetype.split("/")[1];
            const filePath = `${sitter.user.userId}/sitter-${format(now, "yyyyMMddHHmmss")}-${i}.${ext}`;

            const { error } = await supabaseClient.storage
              .from(bucket)
              .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
              });

            if (error) throw error;

            filePaths.push(filePath);
<<<<<<< Updated upstream

            const { data } = supabaseClient.storage
=======
            const { data } = supabaseAdmin.storage
>>>>>>> Stashed changes
              .from(bucket)
              .getPublicUrl(filePath);
            publicUrls.push(data.publicUrl);
          }
        }

        // Merge retained existing images with newly uploaded ones, preserving display order
        finalUrls = mergeItemsByOrder(
          existingImages ?? [],
          publicUrls.map((url) => ({ url })),
        ).map((item) => item.url);
      }

      // Fall back to current sitter values for any field not provided
      await SitterRepository.pendingUpdate(
        sitterId,
        experience !== undefined ? experience : sitter.experience,
        tradeName !== undefined ? tradeName : sitter.tradeName,
        petTypeIds !== undefined
          ? petTypeIds
          : sitter.petSittersPetTypes.map((p) => p.petType.petTypeId),
        introduction !== undefined ? introduction : sitter.introduction,
        services !== undefined ? services : sitter.services,
        description !== undefined ? description : sitter.description,
        address !== undefined ? address : sitter.address,
        latitude !== undefined ? latitude : sitter.latitude,
        longitude !== undefined ? longitude : sitter.longitude,
        provinceId !== undefined
          ? provinceId
          : sitter.province?.provinceId ?? null,
        districtId !== undefined
          ? districtId
          : sitter.district?.districtId ?? null,
        subDistrictId !== undefined
          ? subDistrictId
          : sitter.subDistrict?.subDistrictId ?? null,
        finalUrls !== undefined
          ? finalUrls
          : sitter.petSitterImages.map((image) => image.imgUrl),
      );

      // Mark non-approved sitters as "Waiting for approval" and flag pending update
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
        true, // hasPendingUpdate = true
        undefined,
        null, // clear any previous admin note
      );
    } catch (error) {
      // Clean up uploaded files if anything fails mid-way
      if (filePaths.length) {
        await supabaseClient.storage.from(bucket).remove(filePaths);
      }
      throw error;
    }
  },

  // Approves a pending update: applies changes, regenerates AI embeddings, cleans up old images
  approveUpdateSitter: async (sitterId: number) => {
    const pendingSitter = await SitterRepository.getPendingUpdateById(sitterId);
    if (!pendingSitter)
      throw new AppError(404, "Sitter not found for this pending update");

    const sitter = await SitterRepository.getById(sitterId, false);
    if (!sitter) throw new AppError(404, "Sitter not found");

    const pendingSitterImages = pendingSitter.petSitterImagePendingUpdates.map(
      (img) => img.imgUrl,
    );

    // Images present in current profile but absent in pending update are now stale — delete them
    const removedImages = sitter.petSitterImages
      .filter((img) => !pendingSitterImages.includes(img.imgUrl))
      .map((img) => img.imgUrl.split(`/${bucket}/`)[1]);

    // Build metadata and text content for AI vector search
    const metadata: DocumentMetadata = {
      tradeName: pendingSitter.tradeName ?? undefined,
      provinceId: pendingSitter.province?.provinceId,
      districtId: pendingSitter.district?.districtId,
      petTypeIds: pendingSitter.petSittersPetTypesPendingUpdates.length
        ? pendingSitter.petSittersPetTypesPendingUpdates.map(
            (p) => p.petType.petTypeId,
          )
        : undefined,
    };

    const contents = buildSitterEmbeddingContents(
      pendingSitter.introduction,
      pendingSitter.services,
      pendingSitter.description,
    );

    // Generate embeddings in parallel for all content sections
    const embeddings = await Promise.all(
      contents.map((c) => sentenceToVector(c)),
    );

    if (removedImages.length) {
      await supabaseClient.storage.from(bucket).remove(removedImages);
    }

    // Promote pending values to live profile and set status to Approved
    await SitterRepository.update(
      sitterId,
      pendingSitter.experience,
      pendingSitter.tradeName,
      pendingSitter.petSittersPetTypesPendingUpdates.map(
        (p) => p.petType.petTypeId,
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
      false, // hasPendingUpdate = false
      pendingSitterImages,
      null, // clear admin note
    );

    await SitterRepository.deletePendingUpdate(sitterId);

    // Refresh vector search document with new content
    await DocumentRepository.deleteSitterDocument(sitterId);
    await DocumentRepository.createSitterDocument(
      sitterId,
      contents,
      embeddings,
      metadata,
    );
  },

  // Rejects or cancels a pending update; removes newly uploaded images that aren't in the live profile
  cancelUpdateSitter: async (
    sitterId: number,
    cancelBy: "sitter" | "admin",
    adminNote?: string,
  ) => {
    const pendingSitter = await SitterRepository.getPendingUpdateById(sitterId);
    if (!pendingSitter)
      throw new AppError(404, "Sitter not found for this pending update");

    const sitter = await SitterRepository.getById(sitterId, false);
    if (!sitter) throw new AppError(404, "Sitter not found");

    const sitterImages = sitter.petSitterImages.map((img) => img.imgUrl);

    // Only delete images that were newly uploaded in the pending update (not shared with live profile)
    const removedImages = pendingSitter.petSitterImagePendingUpdates
      .filter((img) => !sitterImages.includes(img.imgUrl))
      .map((img) => img.imgUrl.split(`/${bucket}/`)[1]);

    if (removedImages.length) {
      await supabaseClient.storage.from(bucket).remove(removedImages);
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
      // Admin rejection sets "Rejected"; sitter self-cancel sets "Unapproved"; approved sitters keep their status
      sitter.status !== "Approved"
        ? cancelBy === "admin"
          ? "Rejected"
          : "Unapproved"
        : undefined,
      false, // hasPendingUpdate = false
      undefined,
<<<<<<< Updated upstream
      cancelBy === "admin" ? adminNote ?? null : null,
=======
      cancelBy === "admin" ? (adminNote ?? null) : null, // Only admins can leave a note
>>>>>>> Stashed changes
    );

    await SitterRepository.deletePendingUpdate(sitterId);
  },

  // Clears the admin's rejection note from the sitter's profile
  deleteAdminReviewSitter: async (sitterId: number) => {
    const sitter = await SitterRepository.getById(sitterId, false);
    if (!sitter) throw new AppError(404, "Sitter not found");

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
      null, // adminNote = null
    );
  },

  // Removes the sitter's vector search document when they are banned (makes them unsearchable)
  banSitter: async (sitterId: number) => {
    const sitter = await SitterRepository.getById(sitterId, false);
    if (!sitter) throw new AppError(404, "Sitter not found");

    await DocumentRepository.deleteSitterDocument(sitter.petSitterId);
  },

  // Restores the sitter's vector search document when unbanned (makes them searchable again)
  unbanSitter: async (sitterId: number) => {
    const sitter = await SitterRepository.getById(sitterId, false);
    if (!sitter) throw new AppError(404, "Sitter not found");

    const metadata: DocumentMetadata = {
      tradeName: sitter.tradeName ?? undefined,
      provinceId: sitter.province?.provinceId,
      districtId: sitter.district?.districtId,
      petTypeIds: sitter.petSittersPetTypes.length
        ? sitter.petSittersPetTypes.map((p) => p.petType.petTypeId)
        : undefined,
    };

    const contents = buildSitterEmbeddingContents(
      sitter.introduction,
      sitter.services,
      sitter.description,
    );

    const embeddings = await Promise.all(
      contents.map((c) => sentenceToVector(c)),
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
