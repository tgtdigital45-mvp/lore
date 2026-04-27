import type { Router } from "express";

export function mountAppointmentsRoutes(router: Router): void {
  router.get("/health", (_req, res) => {
    res.json({ ok: true, module: "appointments", status: "stub" });
  });
}
