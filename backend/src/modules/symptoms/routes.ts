import type { Router } from "express";

export function mountSymptomsRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    res.json({ ok: true, module: "symptoms", status: "stub" });
  });
}
