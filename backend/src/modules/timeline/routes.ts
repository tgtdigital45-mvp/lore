import type { Router } from "express";

export function mountTimelineRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    res.json({ ok: true, module: "timeline", status: "stub" });
  });
}
