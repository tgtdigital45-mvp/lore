import type { NextFunction, Request, Response } from "express";
import type { Env } from "../lib/config.js";
import { createUserSupabase } from "../lib/supabase.js";
import { verifySupabaseAccessToken } from "../lib/supabaseJwt.js";

export function authenticateBearer(env: Env) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        error: "missing_bearer_token",
        message: "Envie o cabeçalho Authorization: Bearer <token>.",
      });
      return;
    }
    const token = authHeader.slice("Bearer ".length).trim();
    const verified = await verifySupabaseAccessToken(token, env);
    if ("error" in verified) {
      res.status(401).json({
        error: "invalid_session",
        message: "Sessão inválida ou expirada. Entre novamente.",
      });
      return;
    }
    const supabase = createUserSupabase(env, token);
    req.authUser = { supabase, userId: verified.userId };
    next();
  };
}
