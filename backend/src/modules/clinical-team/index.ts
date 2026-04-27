import { Router } from "express";
import { mountClinicalTeamRoutes } from "./routes.js";

const router = Router();
mountClinicalTeamRoutes(router);
export default router;
