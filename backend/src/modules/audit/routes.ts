import type { Router } from "express";

export function mountAuditRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    res.json({ ok: true, module: "audit", status: "stub" });
  });
}
