import { Router } from "express";
import { mountPatientsRoutes } from "./routes.js";

const router = Router();
mountPatientsRoutes(router);
export default router;
