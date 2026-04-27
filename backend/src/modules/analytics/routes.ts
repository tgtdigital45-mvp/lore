import type { Router } from "express";

export function mountAnalyticsRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    res.json({ ok: true, module: "analytics", status: "stub" });
  });
}
