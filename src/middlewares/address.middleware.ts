import { NextFunction, Request, Response } from "express";
import { DistrictIdParams, ProvinceIdParams } from "../types/address";

const AddressMiddleware = {
  provinceId: (
    req: Request<ProvinceIdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    const provinceId = req.params.provinceId;
    const parsedProvinceId = Number(provinceId);

    if (!Number.isInteger(parsedProvinceId) || parsedProvinceId <= 0) {
      return res.status(400).json({
        error: "Province ID must be a positive integer",
      });
    }

    if (parsedProvinceId < 10 || parsedProvinceId > 96) {
      return res.status(400).json({
        error: "Province ID must be between 10 and 96",
      });
    }

    next();
  },

  districtId: (
    req: Request<DistrictIdParams>,
    res: Response,
    next: NextFunction,
  ) => {
    const districtId = req.params.districtId;
    const parsedDistrictId = Number(districtId);

    if (!Number.isInteger(parsedDistrictId) || parsedDistrictId <= 0) {
      return res.status(400).json({
        error: "District ID must be a positive integer",
      });
    }

    if (parsedDistrictId < 1001 || parsedDistrictId > 9699) {
      return res.status(400).json({
        error: "District ID must be between 1001 and 9699",
      });
    }

    next();
  },
};

export default AddressMiddleware;
