import { Router } from "express";
import PetController from "../controllers/pet.controller";

const PetRoute = Router();

PetRoute.get("/type", PetController.getPetType);

export default PetRoute;
