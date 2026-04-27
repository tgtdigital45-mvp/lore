import { Router } from "express";
import { mountAuditRoutes } from "./routes.js";

const router = Router();
mountAuditRoutes(router);
export default router;
