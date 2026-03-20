import { Router } from "express";
import ReportController from "../controllers/report.controller";

const ReportRoute = Router();

ReportRoute.post("/", ReportController.createReport);

export default ReportRoute;
