import AppError from "../errors/AppError";
import AddressRepository from "../repositories/address.repository";

const AddressService = {
  getProvinces: async () => {
    return AddressRepository.getProvinces();
  },

  getDistrictsByProvince: async (provinceId: number) => {
    const province = await AddressRepository.getProvinces().then((provinces) =>
      provinces.find((p) => p.provinceId === provinceId),
    );

    if (!province) {
      throw new AppError(404, "Province not found");
    }

    return AddressRepository.getDistrictsByProvinceId(provinceId);
  },

  getSubDistrictsByDistrict: async (districtId: number) => {
    const district = await AddressRepository.getDistricts().then((districts) =>
      districts.find((d) => d.districtId === districtId),
    );

    if (!district) {
      throw new AppError(404, "District not found");
    }

    return AddressRepository.getSubdistrictsByDistrictId(districtId);
  },
};

export default AddressService;
