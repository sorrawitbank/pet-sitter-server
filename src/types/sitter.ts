import { ParamsDictionary } from "express-serve-static-core";
import { petSitters } from "../db/schema";

export type SitterStatus = (typeof petSitters.$inferSelect)["status"];

export const SITTER_STATUS: readonly SitterStatus[] = [
  "Unapproved",
  "Waiting for approval",
  "Approved",
  "Rejected",
];

export interface SitterIdParams extends ParamsDictionary {
  sitterId: string;
}

export interface GetSittersQuery {
  seed?: string;
  page?: string;
  limit?: string;
  keyword?: string;
  pet_type?: string;
  rating?: string;
  experience?: string;
  lat?: string;
  lon?: string;
  radius?: string;
}

export interface UpdateSitterBody {
  experience?: number | null;
  tradeName?: string | null;
  petTypeIds?: number[] | null;
  introduction?: string | null;
  services?: string | null;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  provinceId?: number | null;
  districtId?: number | null;
  subDistrictId?: number | null;
  existingImages?: {
    url: string;
    order: number;
  }[];
}
