import type { NextFunction, Request, Response } from "express";

type Cached = { timestamp: number; status: number; body: unknown };

const cache = new Map<string, Cached>();

/** Respostas repetidas para o mesmo Idempotency-Key dentro da janela (memória do processo). */
export function idempotencyMiddleware(windowMs = 120_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers["idempotency-key"];
    if (typeof key !== "string" || key.length < 8 || key.length > 128) {
      next();
      return;
    }

    const hit = cache.get(key);
    if (hit && Date.now() - hit.timestamp < windowMs) {
      res.status(hit.status).json(hit.body);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      cache.set(key, { timestamp: Date.now(), status: res.statusCode, body });
      if (cache.size > 10_000) {
        const cutoff = Date.now() - windowMs;
        for (const [k, v] of cache) {
          if (v.timestamp < cutoff) cache.delete(k);
        }
      }
      return originalJson(body);
    };
    next();
  };
}
