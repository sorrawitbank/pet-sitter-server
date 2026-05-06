import { Request, Response } from "express";
import AppError from "../errors/AppError";
import AddressService from "../services/address.service";
import { DistrictIdParams, ProvinceIdParams } from "../types/address";

const AddressController = {
  getProvinces: async (req: Request, res: Response) => {
    try {
      const result = await AddressService.getProvinces();
      return res.status(200).json(result);
    } catch {
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  getDistrictsByProvince: async (
    req: Request<ProvinceIdParams>,
    res: Response,
  ) => {
    const provinceId = Number(req.params.provinceId);
    if (isNaN(provinceId)) {
      return res.status(400).json({ error: "Invalid province ID" });
    }

    try {
      const result = await AddressService.getDistrictsByProvince(provinceId);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  getSubDistrictsByDistrict: async (
    req: Request<DistrictIdParams>,
    res: Response,
  ) => {
    const districtId = Number(req.params.districtId);
    if (isNaN(districtId)) {
      return res.status(400).json({ error: "Invalid district ID" });
    }

    try {
      const result = await AddressService.getSubDistrictsByDistrict(districtId);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};

export default AddressController;
