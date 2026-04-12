import { Router } from "express";
import PetController from "../controllers/pet.controller";
import OwnerController from "../controllers/owner.controller";
import PetMiddleware from "../middlewares/pet.middleware";
import ProtectMiddleware from "../middlewares/protect.middleware";
import UploadMiddleware from "../middlewares/upload.middleware";
import UserMiddleware from "../middlewares/user.middleware";

const OwnerRoute = Router();

OwnerRoute.get("/pet", [ProtectMiddleware.owner], PetController.getPets);

OwnerRoute.get(
  "/pet/:petId",
  [PetMiddleware.petId, ProtectMiddleware.owner],
  PetController.getPetById,
);

OwnerRoute.post(
  "/pet",
  [
    UploadMiddleware.singleImage("image"),
    UploadMiddleware.requireFile("image"),
    PetMiddleware.createPetBody,
    ProtectMiddleware.owner,
  ],
  PetController.createPet,
);

OwnerRoute.put(
  "/pet/:petId",
  [
    UploadMiddleware.singleImage("image"),
    PetMiddleware.petId,
    PetMiddleware.updatePetBody,
    ProtectMiddleware.owner,
  ],
  PetController.updatePet,
);

OwnerRoute.put(
  "/profile",
  [
    UploadMiddleware.singleImage("image"),
    UserMiddleware.updateUserBody,
    ProtectMiddleware.owner,
  ],
  OwnerController.updateOwner,
);

OwnerRoute.delete(
  "/pet/:petId",
  [PetMiddleware.petId, ProtectMiddleware.owner],
  PetController.deletePet,
);

export default OwnerRoute;
