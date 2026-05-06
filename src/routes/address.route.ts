import { Router } from "express";
import AddressController from "../controllers/address.controller";
import AddressMiddleware from "../middlewares/address.middleware";

const AddressRoute = Router();

// GET /location/provinces
AddressRoute.get("/provinces", AddressController.getProvinces);

// GET /location/provinces/:provinceId/districts
AddressRoute.get(
  "/provinces/:provinceId/districts",
  [AddressMiddleware.provinceId],
  AddressController.getDistrictsByProvince,
);

// GET /location/districts/:districtId/sub-districts
AddressRoute.get(
  "/districts/:districtId/sub-districts",
  [AddressMiddleware.districtId],
  AddressController.getSubDistrictsByDistrict,
);

export default AddressRoute;
