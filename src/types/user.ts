import { ParamsDictionary } from "express-serve-static-core";
import { users } from "../db/schema";

export type UserRole = (typeof users.$inferSelect)["role"];
export type UserStatus = (typeof users.$inferSelect)["status"];

export const USER_ROLES: readonly UserRole[] = ["owner", "sitter", "admin"];
export const USER_STATUS: readonly UserStatus[] = ["Normal", "Banned"];

export interface UserIdParams extends ParamsDictionary {
  userId: string;
}

export interface UpdateUserBody {
  name?: string;
  phone?: string;
  idNumber?: string | null;
  dateOfBirth?: string | null;
  removeProfileImg?: boolean;
}
