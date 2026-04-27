import { Router } from "express";
import { mountTasksRoutes } from "./routes.js";

const router = Router();
mountTasksRoutes(router);
export default router;
