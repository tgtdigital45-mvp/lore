import { Router } from "express";
import { mountPermissionsRoutes } from "./routes.js";

const router = Router();
mountPermissionsRoutes(router);
export default router;
