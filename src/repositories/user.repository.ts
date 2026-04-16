import { eq } from "drizzle-orm";
import db from "../db/db";
import {
  petSitterBanks,
  petSitters,
  userPendingUpdates,
  users,
} from "../db/schema";
import { UserRole, UserStatus } from "../types/user";

const UserRepository = {
  getById: async (userId: string) => {
    return (await db.select().from(users).where(eq(users.userId, userId)))[0];
  },

  getByPhone: async (phone: string) => {
    return (await db.select().from(users).where(eq(users.phone, phone)))[0];
  },

  getByIdNumber: async (idNumber: string) => {
    return (
      await db.select().from(users).where(eq(users.idNumber, idNumber))
    )[0];
  },

  getByPendingPhone: async (phone: string) => {
    return (
      await db
        .select()
        .from(userPendingUpdates)
        .where(eq(userPendingUpdates.phone, phone))
    )[0];
  },

  getByPendingIdNumber: async (idNumber: string) => {
    return (
      await db
        .select()
        .from(userPendingUpdates)
        .where(eq(userPendingUpdates.idNumber, idNumber))
    )[0];
  },

  getPendingUpdateById: async (userId: string) => {
    return (
      await db
        .select()
        .from(userPendingUpdates)
        .where(eq(userPendingUpdates.userId, userId))
    )[0];
  },

  create: async (
    userId: string,
    phone: string,
    role: UserRole,
    email: string,
  ) => {
    const defaultName = role === "owner" ? "New Guest" : "New Sitter";

    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({ userId, name: defaultName, phone, role, email })
        .returning();

      if (user.role === "sitter") {
        const sitter = await tx
          .insert(petSitters)
          .values({ userId: user.userId })
          .returning();

        await tx
          .insert(petSitterBanks)
          .values({ petSitterId: sitter[0].petSitterId });
      }
    });
  },

  pendingUpdate: async (
    userId: string,
    name: string,
    phone: string,
    profileImgUrl: string | null | undefined,
    idNumber: string | null | undefined,
    dateOfBirth: string | null | undefined,
  ) => {
    await db.insert(userPendingUpdates).values({
      userId,
      name,
      phone,
      profileImgUrl,
      idNumber,
      dateOfBirth,
    });
  },

  update: async (
    userId: string,
    name: string | undefined,
    phone: string | undefined,
    profileImgUrl: string | null | undefined,
    idNumber: string | null | undefined,
    dateOfBirth: string | null | undefined,
    email: string | undefined,
    status: UserStatus | undefined,
  ) => {
    await db
      .update(users)
      .set({ name, phone, profileImgUrl, idNumber, dateOfBirth, email, status })
      .where(eq(users.userId, userId));
  },

  deletePendingUpdate: async (userId: string) => {
    await db
      .delete(userPendingUpdates)
      .where(eq(userPendingUpdates.userId, userId));
  },
};

export default UserRepository;
