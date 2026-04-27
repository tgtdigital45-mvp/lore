import { Router } from "express";
import { mountAnalyticsRoutes } from "./routes.js";

const router = Router();
mountAnalyticsRoutes(router);
export default router;
