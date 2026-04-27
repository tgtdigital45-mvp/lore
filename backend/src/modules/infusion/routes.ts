import type { Router } from "express";

export function mountInfusionRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    res.json({ ok: true, module: "infusion", status: "stub" });
  });
}
