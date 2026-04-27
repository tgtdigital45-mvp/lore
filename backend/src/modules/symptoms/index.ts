import { Router } from "express";
import { mountSymptomsRoutes } from "./routes.js";

const router = Router();
mountSymptomsRoutes(router);
export default router;
