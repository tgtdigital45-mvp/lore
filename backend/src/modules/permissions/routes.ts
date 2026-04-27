import type { Router } from "express";

export function mountPermissionsRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    res.json({ ok: true, module: "permissions", status: "stub" });
  });
}
