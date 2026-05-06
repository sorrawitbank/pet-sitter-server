import db from "../db/db";
import { provinces, districts, subDistricts } from "../db/schema";
import { eq } from "drizzle-orm";

const AddressRepository = {
  getProvinces: async () => {
    return db.select().from(provinces);
  },
  getDistricts: async () => {
    return db.select().from(districts);
  },
  getSubdistricts: async () => {
    return db.select().from(subDistricts);
  },
  getDistrictsByProvinceId: async (provinceId: number) => {
    return db
      .select()
      .from(districts)
      .where(eq(districts.provinceId, provinceId));
  },
  getSubdistrictsByDistrictId: async (districtId: number) => {
    return db
      .select()
      .from(subDistricts)
      .where(eq(subDistricts.districtId, districtId));
  },
};

export default AddressRepository;
