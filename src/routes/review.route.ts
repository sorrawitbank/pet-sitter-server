import { Router } from "express";
import ReviewController from "../controllers/review.controller";

const Reviewroute = Router();

Reviewroute.post("/", ReviewController.createReview);

export default Reviewroute;
