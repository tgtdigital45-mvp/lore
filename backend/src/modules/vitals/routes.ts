import type { Router } from "express";

export function mountVitalsRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    res.json({ ok: true, module: "vitals", status: "stub" });
  });
}
