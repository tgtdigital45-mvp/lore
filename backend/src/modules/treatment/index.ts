import { Router } from "express";
import { mountTreatmentRoutes } from "./routes.js";

const router = Router();
mountTreatmentRoutes(router);
export default router;
