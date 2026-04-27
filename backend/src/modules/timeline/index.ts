import { Router } from "express";
import { mountTimelineRoutes } from "./routes.js";

const router = Router();
mountTimelineRoutes(router);
export default router;
