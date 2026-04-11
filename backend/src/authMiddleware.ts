import type { NextFunction, Request, Response } from "express";
import type { Env } from "./config.js";
import { createUserSupabase } from "./supabase.js";

export function authenticateBearer(env: Env) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Bearer token" });
      return;
    }
    const token = authHeader.slice("Bearer ".length).trim();
    const supabase = createUserSupabase(env, token);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      res.status(401).json({ error: "Invalid session" });
      return;
    }
    req.authUser = { supabase, userId: userData.user.id };
    next();
  };
}
