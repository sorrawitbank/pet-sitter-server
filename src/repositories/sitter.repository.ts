import {
  and,
  asc,
  count,
  countDistinct,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from "drizzle-orm";
import db from "../db/db";
import {
  petSitterImagePendingUpdates,
  petSitterImages,
  petSitterPendingUpdates,
  petSitters,
  petSittersPetTypes,
  petSittersPetTypesPendingUpdates,
  petTypes,
  users,
} from "../db/schema";
import { SitterStatus } from "../types/sitter";
import { UserStatus } from "../types/user";

const SitterRepository = {
  getFilterMatchedSitterIds: async (
    keyword: string | null,
    petType: string[] | null,
    rating: number | null,
    experience: number[] | null,
    hasPendingUpdate: boolean | null,
    status: SitterStatus | Extract<UserStatus, "Banned"> | null,
    canFilterByName: boolean = false,
    canFilterByEmail: boolean = false,
  ) => {
    const filters = [];

    if (keyword) {
      const keywordFilters = [ilike(petSitters.tradeName, `%${keyword}%`)];

      const sitterIdsByPetTypeKeyword = await db
        .selectDistinct({ petSitterId: petSittersPetTypes.petSitterId })
        .from(petSittersPetTypes)
        .innerJoin(
          petTypes,
          eq(petTypes.petTypeId, petSittersPetTypes.petTypeId),
        )
        .where(ilike(petTypes.name, `%${keyword}%`));

      const sitterIdsFromPetTypes = sitterIdsByPetTypeKeyword.map(
        (row) => row.petSitterId,
      );

      if (sitterIdsFromPetTypes.length > 0) {
        keywordFilters.push(
          inArray(petSitters.petSitterId, sitterIdsFromPetTypes),
        );
      }

      if (canFilterByName || canFilterByEmail) {
        const userKeywordConditions = [];
        if (canFilterByName) {
          userKeywordConditions.push(ilike(users.name, `%${keyword}%`));
        }
        if (canFilterByEmail) {
          userKeywordConditions.push(ilike(users.email, `%${keyword}%`));
        }
        const sitterIdsByUserKeyword = await db
          .selectDistinct({ petSitterId: petSitters.petSitterId })
          .from(petSitters)
          .innerJoin(users, eq(users.userId, petSitters.userId))
          .where(or(...userKeywordConditions));

        const ids = sitterIdsByUserKeyword.map((row) => row.petSitterId);

        if (ids.length > 0) {
          keywordFilters.push(inArray(petSitters.petSitterId, ids));
        }
      }

      filters.push(or(...keywordFilters));
    }

    if (petType) {
      const sitterIdsWithAllPetTypes = await db
        .select({ petSitterId: petSittersPetTypes.petSitterId })
        .from(petSittersPetTypes)
        .innerJoin(
          petTypes,
          eq(petTypes.petTypeId, petSittersPetTypes.petTypeId),
        )
        .where(inArray(petTypes.name, petType))
        .groupBy(petSittersPetTypes.petSitterId)
        .having(eq(countDistinct(petTypes.name), petType.length));

      const sitterIds = sitterIdsWithAllPetTypes.map((row) => row.petSitterId);

      if (!sitterIds.length) {
        return [];
      }

      filters.push(inArray(petSitters.petSitterId, sitterIds));
    }

    if (experience) {
      filters.push(gte(petSitters.experience, String(experience[0])));
      if (experience[1] !== Infinity) {
        filters.push(lte(petSitters.experience, String(experience[1])));
      }
    }

    if (typeof hasPendingUpdate === "boolean") {
      filters.push(eq(petSitters.hasPendingUpdate, hasPendingUpdate));
    }

    if (status) {
      if (status === "Banned") {
        const sitterIdsByBannedStatus = await db
          .selectDistinct({ petSitterId: petSitters.petSitterId })
          .from(petSitters)
          .innerJoin(users, eq(users.userId, petSitters.userId))
          .where(eq(users.status, "Banned"));

        const ids = sitterIdsByBannedStatus.map((row) => row.petSitterId);

        filters.push(inArray(petSitters.petSitterId, ids));
      } else {
        const sitterIdsByBannedStatus = await db
          .selectDistinct({ petSitterId: petSitters.petSitterId })
          .from(petSitters)
          .innerJoin(users, eq(users.userId, petSitters.userId))
          .where(eq(users.status, "Normal"));

        const ids = sitterIdsByBannedStatus.map((row) => row.petSitterId);

        filters.push(
          and(
            inArray(petSitters.petSitterId, ids),
            eq(petSitters.status, status),
          ),
        );
      }
    }

    const whereClause = filters.length ? and(...filters) : undefined;
    const rows = await db
      .select({ petSitterId: petSitters.petSitterId })
      .from(petSitters)
      .where(whereClause);

    return rows.map((row) => row.petSitterId);
  },

  get: async (
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
    const offset = (page - 1) * limit;
    const filters = [];

    if (keyword) {
      const keywordFilters = [ilike(petSitters.tradeName, `%${keyword}%`)];

      const sitterIdsByPetTypeKeyword = await db
        .selectDistinct({ petSitterId: petSittersPetTypes.petSitterId })
        .from(petSittersPetTypes)
        .innerJoin(
          petTypes,
          eq(petTypes.petTypeId, petSittersPetTypes.petTypeId),
        )
        .where(ilike(petTypes.name, `%${keyword}%`));

      const sitterIdsFromPetTypes = sitterIdsByPetTypeKeyword.map(
        (row) => row.petSitterId,
      );

      if (sitterIdsFromPetTypes.length > 0) {
        keywordFilters.push(
          inArray(petSitters.petSitterId, sitterIdsFromPetTypes),
        );
      }

      if (canFilterByName || canFilterByEmail) {
        const userKeywordConditions = [];
        if (canFilterByName) {
          userKeywordConditions.push(ilike(users.name, `%${keyword}%`));
        }
        if (canFilterByEmail) {
          userKeywordConditions.push(ilike(users.email, `%${keyword}%`));
        }
        const sitterIdsByUserKeyword = await db
          .selectDistinct({ petSitterId: petSitters.petSitterId })
          .from(petSitters)
          .innerJoin(users, eq(users.userId, petSitters.userId))
          .where(or(...userKeywordConditions));

        const ids = sitterIdsByUserKeyword.map((row) => row.petSitterId);

        if (ids.length > 0) {
          keywordFilters.push(inArray(petSitters.petSitterId, ids));
        }
      }

      filters.push(or(...keywordFilters));
    }

    if (petType) {
      const sitterIdsWithAllPetTypes = await db
        .select({ petSitterId: petSittersPetTypes.petSitterId })
        .from(petSittersPetTypes)
        .innerJoin(
          petTypes,
          eq(petTypes.petTypeId, petSittersPetTypes.petTypeId),
        )
        .where(inArray(petTypes.name, petType))
        .groupBy(petSittersPetTypes.petSitterId)
        .having(eq(countDistinct(petTypes.name), petType.length));

      const sitterIds = sitterIdsWithAllPetTypes.map((row) => row.petSitterId);

      if (!sitterIds.length) {
        return { result: [], totalPetSitters: 0 };
      }

      filters.push(inArray(petSitters.petSitterId, sitterIds));
    }

    if (experience) {
      filters.push(gte(petSitters.experience, String(experience[0])));
      if (experience[1] !== Infinity) {
        filters.push(lte(petSitters.experience, String(experience[1])));
      }
    }

    if (typeof hasPendingUpdate === "boolean") {
      filters.push(eq(petSitters.hasPendingUpdate, hasPendingUpdate));
    }

    if (status) {
      if (status === "Banned") {
        const sitterIdsByBannedStatus = await db
          .selectDistinct({ petSitterId: petSitters.petSitterId })
          .from(petSitters)
          .innerJoin(users, eq(users.userId, petSitters.userId))
          .where(eq(users.status, "Banned"));

        const ids = sitterIdsByBannedStatus.map((row) => row.petSitterId);

        filters.push(inArray(petSitters.petSitterId, ids));
      } else {
        const sitterIdsByBannedStatus = await db
          .selectDistinct({ petSitterId: petSitters.petSitterId })
          .from(petSitters)
          .innerJoin(users, eq(users.userId, petSitters.userId))
          .where(eq(users.status, "Normal"));

        const ids = sitterIdsByBannedStatus.map((row) => row.petSitterId);

        filters.push(
          and(
            inArray(petSitters.petSitterId, ids),
            eq(petSitters.status, status),
          ),
        );
      }
    }

    const whereClause = filters.length ? and(...filters) : undefined;

    const result = await db.query.petSitters.findMany({
      columns: {
        petSitterId: true,
        tradeName: true,
        latitude: true,
        longitude: true,
        ratingAvg: true,
        hasPendingUpdate: true,
        status: true,
      },
      with: {
        user: {
          columns: {
            name: true,
            profileImgUrl: true,
            email: true,
            status: true,
          },
        },
        petSitterImages: {
          columns: { imgUrl: true },
          orderBy: [asc(petSitterImages.imageOrder)],
        },
        province: { columns: { name: true } },
        district: { columns: { name: true } },
        petSittersPetTypes: {
          columns: {},
          with: {
            petType: { columns: { name: true } },
          },
          orderBy: [asc(petTypes.petTypeId)],
        },
      },
      where: whereClause,
      orderBy: [
        ...(rating ? [sql`ABS(${petSitters.ratingBucket} - ${rating})`] : []),
        sql`md5(${petSitters.petSitterId}::text || ${seed})`,
      ],
      limit,
      offset,
    });

    const countResult = await db
      .select({ total: count() })
      .from(petSitters)
      .where(whereClause);

    const totalPetSitters = countResult[0].total;

    return { result, totalPetSitters };
  },

  getByLocation: async (
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
    radius: number,
    canFilterByName: boolean = false,
    canFilterByEmail: boolean = false,
  ) => {
    const offset = (page - 1) * limit;
    const filteredIds = await SitterRepository.getFilterMatchedSitterIds(
      keyword,
      petType,
      rating,
      experience,
      hasPendingUpdate,
      status,
      canFilterByName,
      canFilterByEmail,
    );

    if (!filteredIds.length) {
      return { result: [], totalPetSitters: 0 };
    }

    const locationCondition = and(
      inArray(petSitters.petSitterId, filteredIds),
      sql`location IS NOT NULL`,
      sql`ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        ${radius}
      )`,
    );

    const locationRows = await db
      .select({ petSitterId: petSitters.petSitterId })
      .from(petSitters)
      .where(locationCondition)
      .orderBy(
        sql`ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
        ) ASC`,
        sql`${petSitters.ratingAvg} DESC NULLS LAST`,
        asc(petSitters.petSitterId),
      )
      .limit(limit)
      .offset(offset);

    const countRows = await db
      .select({ total: count() })
      .from(petSitters)
      .where(locationCondition);

    const orderedIds = locationRows.map((row) => row.petSitterId);
    const totalPetSitters = countRows[0]?.total ?? 0;

    if (!orderedIds.length) {
      return { result: [], totalPetSitters };
    }

    const result = await db.query.petSitters.findMany({
      columns: {
        petSitterId: true,
        tradeName: true,
        latitude: true,
        longitude: true,
        ratingAvg: true,
        hasPendingUpdate: true,
        status: true,
      },
      with: {
        user: {
          columns: {
            name: true,
            profileImgUrl: true,
            email: true,
            status: true,
          },
        },
        petSitterImages: {
          columns: { imgUrl: true },
          orderBy: [asc(petSitterImages.imageOrder)],
        },
        province: { columns: { name: true } },
        district: { columns: { name: true } },
        petSittersPetTypes: {
          columns: {},
          with: {
            petType: { columns: { name: true } },
          },
          orderBy: [asc(petTypes.petTypeId)],
        },
      },
      where: inArray(petSitters.petSitterId, orderedIds),
    });

    const resultMap = new Map(result.map((item) => [item.petSitterId, item]));
    const orderedResult = orderedIds
      .map((id) => resultMap.get(id))
      .filter((item) => item !== undefined);

    return { result: orderedResult, totalPetSitters };
  },

  getById: async (sitterId: number, onlyApproved: boolean = true) => {
    const filters = [];

    if (onlyApproved) {
      filters.push(eq(petSitters.status, "Approved"));
    }

    const whereClause = and(eq(petSitters.petSitterId, sitterId), ...filters);

    const result = await db.query.petSitters.findFirst({
      columns: {
        petSitterId: true,
        tradeName: true,
        experience: true,
        introduction: true,
        services: true,
        description: true,
        address: true,
        latitude: true,
        longitude: true,
        reviewCount: true,
        ratingAvg: true,
        hasPendingUpdate: true,
        status: true,
        adminNote: true,
      },
      with: {
        user: {
          columns: {
            userId: true,
            name: true,
            phone: true,
            profileImgUrl: true,
            idNumber: true,
            dateOfBirth: true,
            email: true,
            status: true,
          },
        },
        petSitterImages: {
          columns: { imgUrl: true },
          orderBy: [asc(petSitterImages.imageOrder)],
        },
        province: { columns: { provinceId: true, name: true } },
        district: { columns: { districtId: true, name: true } },
        subDistrict: {
          columns: { subDistrictId: true, name: true, postCode: true },
        },
        petSittersPetTypes: {
          columns: {},
          with: { petType: true },
          orderBy: [asc(petTypes.petTypeId)],
        },
      },
      where: whereClause,
    });

    if (onlyApproved && result?.user?.status === "Banned") {
      return null;
    }

    return result;
  },

  getByUserId: async (userId: string) => {
    return db.query.petSitters.findFirst({
      columns: {
        petSitterId: true,
        tradeName: true,
        experience: true,
        introduction: true,
        services: true,
        description: true,
        address: true,
        latitude: true,
        longitude: true,
        reviewCount: true,
        ratingAvg: true,
        hasPendingUpdate: true,
        status: true,
        adminNote: true,
      },
      with: {
        user: {
          columns: {
            userId: true,
            name: true,
            phone: true,
            profileImgUrl: true,
            idNumber: true,
            dateOfBirth: true,
            email: true,
            status: true,
          },
        },
        petSitterImages: {
          columns: { imgUrl: true },
          orderBy: [asc(petSitterImages.imageOrder)],
        },
        province: { columns: { provinceId: true, name: true } },
        district: { columns: { districtId: true, name: true } },
        subDistrict: {
          columns: { subDistrictId: true, name: true, postCode: true },
        },
        petSittersPetTypes: {
          columns: {},
          with: { petType: true },
          orderBy: [asc(petTypes.petTypeId)],
        },
      },
      where: eq(petSitters.userId, userId),
    });
  },

  getByTradeName: async (tradeName: string) => {
    return (
      await db
        .select()
        .from(petSitters)
        .where(eq(petSitters.tradeName, tradeName))
    )[0];
  },

  getByPendingTradeName: async (tradeName: string) => {
    return (
      await db
        .select()
        .from(petSitterPendingUpdates)
        .where(eq(petSitterPendingUpdates.tradeName, tradeName))
    )[0];
  },

  getPendingUpdateById: async (sitterId: number) => {
    return db.query.petSitterPendingUpdates.findFirst({
      columns: {
        petSitterId: true,
        tradeName: true,
        experience: true,
        introduction: true,
        services: true,
        description: true,
        address: true,
        latitude: true,
        longitude: true,
      },
      with: {
        petSitterImagePendingUpdates: {
          columns: { imgUrl: true },
          orderBy: [asc(petSitterImages.imageOrder)],
        },
        province: { columns: { provinceId: true, name: true } },
        district: { columns: { districtId: true, name: true } },
        subDistrict: {
          columns: { subDistrictId: true, name: true, postCode: true },
        },
        petSittersPetTypesPendingUpdates: {
          columns: {},
          with: { petType: true },
          orderBy: [asc(petTypes.petTypeId)],
        },
      },
      where: eq(petSitterPendingUpdates.petSitterId, sitterId),
    });
  },

  pendingUpdate: async (
    sitterId: number,
    experience: string | null,
    tradeName: string | null,
    petTypeIds: number[] | null,
    introduction: string | null,
    services: string | null,
    description: string | null,
    address: string | null,
    latitude: string | null,
    longitude: string | null,
    provinceId: number | null,
    districtId: number | null,
    subDistrictId: number | null,
    imgUrls: string[],
  ) => {
    await db.transaction(async (tx) => {
      await tx.insert(petSitterPendingUpdates).values({
        petSitterId: sitterId,
        experience,
        tradeName,
        introduction,
        services,
        description,
        address,
        latitude,
        longitude,
        provinceId,
        districtId,
        subDistrictId,
      });

      if (petTypeIds) {
        await tx.insert(petSittersPetTypesPendingUpdates).values(
          petTypeIds.map((petTypeId) => ({
            petSitterId: sitterId,
            petTypeId,
          })),
        );
      }

      if (imgUrls.length) {
        await tx.insert(petSitterImagePendingUpdates).values(
          imgUrls.map((imgUrl, index) => ({
            petSitterId: sitterId,
            imageOrder: index,
            imgUrl,
          })),
        );
      }
    });
  },

  update: async (
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
    status: SitterStatus | undefined,
    hasPendingUpdate: boolean | undefined,
    imgUrls: string[] | undefined,
    adminNote: string | null,
  ) => {
    await db.transaction(async (tx) => {
      await tx
        .update(petSitters)
        .set({
          experience,
          tradeName,
          introduction,
          services,
          description,
          address,
          latitude,
          longitude,
          provinceId,
          districtId,
          subDistrictId,
          hasPendingUpdate,
          status,
          adminNote,
        })
        .where(eq(petSitters.petSitterId, sitterId));

      if (petTypeIds !== undefined) {
        await tx
          .delete(petSittersPetTypes)
          .where(eq(petSittersPetTypes.petSitterId, sitterId));

        if (petTypeIds !== null) {
          await tx.insert(petSittersPetTypes).values(
            petTypeIds.map((petTypeId) => ({
              petSitterId: sitterId,
              petTypeId,
            })),
          );
        }
      }

      if (imgUrls) {
        await tx
          .delete(petSitterImages)
          .where(eq(petSitterImages.petSitterId, sitterId));

        if (imgUrls.length) {
          await tx.insert(petSitterImages).values(
            imgUrls.map((imgUrl, index) => ({
              petSitterId: sitterId,
              imageOrder: index,
              imgUrl,
            })),
          );
        }
      }
    });
  },

  deletePendingUpdate: async (sitterId: number) => {
    await db
      .delete(petSitterPendingUpdates)
      .where(eq(petSitterPendingUpdates.petSitterId, sitterId));
  },
};

export default SitterRepository;
