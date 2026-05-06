import { and, count, eq, ilike, or, sql } from "drizzle-orm";
import db from "../db/db";
import { users } from "../db/schema";
import { UserStatus } from "../types/user";

const OwnerRepository = {
  get: async (
    seed: string,
    page: number,
    limit: number,
    keyword: string | null,
    status: UserStatus | null,
  ) => {
    const offset = (page - 1) * limit;
    const filters = [];

    if (status) {
      filters.push(eq(users.status, status));
    }

    if (keyword) {
      filters.push(
        or(
          ilike(users.name, `%${keyword}%`),
          ilike(users.phone, `%${keyword}%`),
          ilike(users.email, `%${keyword}%`),
        ),
      );
    }

    const whereClause = and(eq(users.role, "owner"), ...filters);

    const result = await db.query.users.findMany({
      columns: {
        userId: true,
        name: true,
        phone: true,
        profileImgUrl: true,
        email: true,
        status: true,
      },
      with: {
        pets: { columns: { petId: true } },
      },
      where: whereClause,
      orderBy: [sql`md5(${users.userId}::text || ${seed})`],
      limit,
      offset,
    });

    const countResult = await db
      .select({ total: count() })
      .from(users)
      .where(whereClause);

    const totalOwners = countResult[0].total;

    return { result, totalOwners };
  },

  getByUserId: async (userId: string) => {
    return db.query.users.findFirst({
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
      where: and(eq(users.role, "owner"), eq(users.userId, userId)),
    });
  },
};

export default OwnerRepository;
