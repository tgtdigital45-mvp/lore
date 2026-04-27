import { Router } from "express";
import { mountAppointmentsRoutes } from "./routes.js";

const router = Router();
mountAppointmentsRoutes(router);
export default router;
