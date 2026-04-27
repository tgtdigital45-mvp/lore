import { Router } from "express";
import { mountVitalsRoutes } from "./routes.js";

const router = Router();
mountVitalsRoutes(router);
export default router;
