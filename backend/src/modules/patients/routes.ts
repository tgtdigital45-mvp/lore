import type { Router } from "express";

export function mountPatientsRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    res.json({ ok: true, module: "patients", status: "stub" });
  });
}
