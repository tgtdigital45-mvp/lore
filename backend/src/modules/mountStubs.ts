import type { Express, Router } from "express";
import patients from "./patients/index.js";
import treatment from "./treatment/index.js";
import symptoms from "./symptoms/index.js";
import vitals from "./vitals/index.js";
import infusion from "./infusion/index.js";
import appointments from "./appointments/index.js";
import timeline from "./timeline/index.js";
import tasks from "./tasks/index.js";
import clinicalTeam from "./clinical-team/index.js";
import audit from "./audit/index.js";
import permissions from "./permissions/index.js";
import analytics from "./analytics/index.js";

const STUB_MODULES: { basePath: string; router: Router }[] = [
  { basePath: "/api/patients", router: patients },
  { basePath: "/api/treatment", router: treatment },
  { basePath: "/api/symptoms", router: symptoms },
  { basePath: "/api/vitals", router: vitals },
  { basePath: "/api/infusion", router: infusion },
  { basePath: "/api/appointments", router: appointments },
  { basePath: "/api/timeline", router: timeline },
  { basePath: "/api/tasks", router: tasks },
  { basePath: "/api/clinical-team", router: clinicalTeam },
  { basePath: "/api/audit", router: audit },
  { basePath: "/api/permissions", router: permissions },
  { basePath: "/api/analytics", router: analytics },
];

/**
 * Mounts healthcheck stub routers for domain modules not yet fully implemented.
 */
export function mountStubModuleRouters(app: Express) {
  for (const { basePath, router } of STUB_MODULES) {
    app.use(basePath, router);
  }
}
