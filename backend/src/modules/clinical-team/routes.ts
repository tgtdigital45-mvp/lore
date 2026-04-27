import type { Router } from "express";

export function mountClinicalTeamRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    res.json({ ok: true, module: "clinical-team", status: "stub" });
  });
}
