import type { Session } from "@supabase/supabase-js";
import { router } from "expo-router";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { InteractionManager } from "react-native";
import { formatAuthError } from "@/src/auth/authErrors";
import { deleteAuthenticatedAccount } from "@/src/auth/deleteAccount";
import { signInWithOAuthGoogle } from "@/src/auth/oauth";
import { queryClient } from "@/src/lib/queryClient";
import { supabase } from "@/src/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  /** Apaga o utilizador no Auth e limpa sessão local; dados em Postgres em cascata. */
  deleteAccount: () => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      console.log("[auth] onAuthStateChange:", event, next?.user?.id ?? "(sem utilizador)");
      setSession(next);
      /**
       * Navega para "/" após login bem-sucedido.
       * Isso funciona como fallback essencial quando o deep link do Google OAuth
       * chega via `auth/callback.tsx` (cold-start ou Android background) em vez de
       * ser capturado diretamente pelo `openAuthSessionAsync` no `login.tsx`.
       * `InteractionManager.runAfterInteractions` corre após o React aplicar `setSession`,
       * evitando corrida em que `app/index.tsx` lia `session === null` após `SIGNED_IN`.
       */
      if (event === "SIGNED_IN" && next) {
        InteractionManager.runAfterInteractions(() => {
          router.replace("/");
        });
      }

      if (event === "TOKEN_REFRESHED" && next) {
        setSession(next);
      }

      /** Limpa cache; navegação fica a cargo de `signOut` no contexto ou do ecrã (ex.: `/login`). */
      if (event === "SIGNED_OUT") {
        queryClient.clear();
      }
    });
    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? formatAuthError(error) : undefined };
      },
      signUp: async (email, password, fullName) => {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        return { error: error ? formatAuthError(error) : undefined };
      },
      signInWithGoogle: () => signInWithOAuthGoogle(),
      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          try {
            await supabase.auth.signOut({ scope: "local" });
          } catch {
            /* sessão local já pode estar limpa */
          }
        } finally {
          queryClient.clear();
          router.replace("/");
        }
      },
      deleteAccount: async () => {
        const { error } = await deleteAuthenticatedAccount();
        if (error) return { error };
        queryClient.clear();
        router.replace("/");
        return {};
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
