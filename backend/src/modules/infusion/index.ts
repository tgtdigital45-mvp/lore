import { Router } from "express";
import { mountInfusionRoutes } from "./routes.js";

const router = Router();
mountInfusionRoutes(router);
export default router;
