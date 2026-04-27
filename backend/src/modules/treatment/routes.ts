import type { Router } from "express";

export function mountTreatmentRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    res.json({ ok: true, module: "treatment", status: "stub" });
  });
}
