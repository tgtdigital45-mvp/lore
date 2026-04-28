"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/queryClient";
import type { Session } from "@supabase/supabase-js";
import { Activity, Eye, EyeOff, Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { refreshSupabaseSessionIfStale } from "@/lib/authSession";
import { supabase } from "@/lib/supabase";
import { formatAuthError } from "@/authErrors";
import { ensureStaffIfPending, setPendingStaffRole } from "@/staffLink";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OncoCareProvider } from "@/context/OncoCareContext";

function AuthSessionSplash() {
  return (
    <div
      className="flex min-h-full w-full flex-col items-center justify-center gap-4 overflow-y-auto bg-slate-950 px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="size-10 animate-spin text-teal-400" aria-hidden />
      <p className="text-sm font-medium text-slate-400">Verificando sessão…</p>
    </div>
  );
}

/** Animated gradient blobs — pure CSS, no JS — that mimic the fluid art on the reference. */
function FluidArt() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      {/* Base dark */}
      <div className="absolute inset-0 bg-[#0d0d18]" />
      {/* Blob 1 – magenta */}
      <div
        className="absolute h-[80%] w-[80%] rounded-full opacity-70"
        style={{
          background: "radial-gradient(ellipse at center, #d946ef 0%, transparent 70%)",
          top: "-20%",
          left: "-15%",
          animation: "fluidBlob1 14s ease-in-out infinite alternate",
        }}
      />
      {/* Blob 2 – violet */}
      <div
        className="absolute h-[70%] w-[70%] rounded-full opacity-60"
        style={{
          background: "radial-gradient(ellipse at center, #7c3aed 0%, transparent 70%)",
          top: "10%",
          left: "20%",
          animation: "fluidBlob2 18s ease-in-out infinite alternate",
        }}
      />
      {/* Blob 3 – blue */}
      <div
        className="absolute h-[60%] w-[60%] rounded-full opacity-50"
        style={{
          background: "radial-gradient(ellipse at center, #2563eb 0%, transparent 70%)",
          bottom: "-10%",
          left: "5%",
          animation: "fluidBlob3 16s ease-in-out infinite alternate",
        }}
      />
      {/* Blob 4 – pink */}
      <div
        className="absolute h-[50%] w-[50%] rounded-full opacity-40"
        style={{
          background: "radial-gradient(ellipse at center, #ec4899 0%, transparent 70%)",
          bottom: "20%",
          right: "-10%",
          animation: "fluidBlob4 20s ease-in-out infinite alternate",
        }}
      />
      {/* Grain overlay for depth */}
      <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
    </div>
  );
}

function OncoCareAuthScreen() {
  const [authView, setAuthView] = useState<"login" | "cadastro" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function resetForm(view: typeof authView) {
    setAuthView(view);
    setEmail("");
    setPassword("");
    setFullName("");
    setAuthError(null);
    setAuthInfo(null);
    setShowPassword(false);
  }

  async function signIn(e: FormEvent) {
    e.preventDefault();
    if (authBusy) return;
    setAuthError(null);
    setAuthInfo(null);
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setAuthBusy(false);
    if (error) setAuthError(formatAuthError(error));
  }

  async function signUp(e: FormEvent) {
    e.preventDefault();
    if (authBusy) return;
    setAuthError(null);
    setAuthInfo(null);
    if (!fullName.trim()) { setAuthError("Informe o nome completo."); return; }
    setAuthBusy(true);
    setPendingStaffRole("hospital_admin");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) { setAuthError(formatAuthError(error)); setAuthBusy(false); return; }
    if (data.session) {
      setAuthInfo("Conta criada e vinculada ao hospital demo. Você já pode usar a triagem.");
      await ensureStaffIfPending();
    } else {
      setAuthInfo("Enviamos um link de confirmação. Após confirmar o e-mail e entrar, seu perfil será vinculado ao hospital demo automaticamente.");
    }
    setAuthBusy(false);
  }

  async function requestPasswordReset(e: FormEvent) {
    e.preventDefault();
    if (authBusy) return;
    setAuthError(null);
    setAuthInfo(null);
    setAuthBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setAuthBusy(false);
    if (error) { setAuthError(formatAuthError(error)); return; }
    setAuthInfo("Link de recuperação enviado — verifique sua caixa de entrada.");
  }

  /* ─────────────────── Quotes ─────────────────── */
  const QUOTES = [
    { text: "O cuidado com o paciente começa muito antes do diagnóstico.", author: "Equipe OncoCare" },
    { text: "Cada decisão clínica tomada com dados é uma vida cuidada com mais segurança.", author: "OncoCare" },
    { text: "Precisão no diagnóstico, humanidade no tratamento.", author: "Princípio OncoCare" },
  ];
  const [quoteIdx] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const quote = QUOTES[quoteIdx];

  /* ─────────────────── Render ─────────────────── */
  const isLogin = authView === "login";
  const isCadastro = authView === "cadastro";
  const isReset = authView === "reset";

  return (
    <>
      {/* ── Keyframe styles injected once ── */}
      <style>{`
        @keyframes fluidBlob1 {
          0%   { transform: translate(0, 0) scale(1) rotate(0deg); }
          50%  { transform: translate(8%, 12%) scale(1.15) rotate(20deg); }
          100% { transform: translate(-5%, 6%) scale(0.9) rotate(-10deg); }
        }
        @keyframes fluidBlob2 {
          0%   { transform: translate(0, 0) scale(1) rotate(0deg); }
          50%  { transform: translate(-10%, -8%) scale(1.2) rotate(-15deg); }
          100% { transform: translate(6%, 14%) scale(1.05) rotate(25deg); }
        }
        @keyframes fluidBlob3 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(12%, -10%) scale(1.1); }
          100% { transform: translate(-8%, 5%) scale(0.95); }
        }
        @keyframes fluidBlob4 {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(-14%, 8%) scale(1.15); }
          100% { transform: translate(6%, -12%) scale(0.9); }
        }
        .auth-input {
          height: 2.75rem;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0 0.875rem;
          font-size: 0.9375rem;
          color: #0f172a;
          width: 100%;
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
        }
        .auth-input:focus {
          border-color: #0f172a;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(15,23,42,0.08);
        }
        .auth-input::placeholder { color: #94a3b8; }
        .auth-btn-primary {
          height: 2.875rem;
          border-radius: 0.625rem;
          background: #0f172a;
          color: #fff;
          font-size: 0.9375rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
          width: 100%;
          transition: background 150ms, transform 100ms;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .auth-btn-primary:hover:not(:disabled) { background: #1e293b; }
        .auth-btn-primary:active:not(:disabled) { transform: scale(0.98); }
        .auth-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div className="flex min-h-full w-full overflow-y-auto bg-white">
        {/* ══════════════ LEFT — fluid art panel ══════════════ */}
        <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden lg:flex">
          <FluidArt />

          {/* Brand badge */}
          <div className="relative z-10 flex items-center gap-2.5 p-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
              <Activity className="size-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-white/60">OncoCare</span>
          </div>

          {/* Quote */}
          <div className="relative z-10 p-8 pb-10">
            <p className="mb-3 text-4xl font-black leading-[1.15] tracking-tight text-white">
              {quote.text}
            </p>
            <p className="text-sm font-medium text-white/50">{quote.author}</p>
          </div>
        </div>

        {/* ══════════════ RIGHT — form panel ══════════════ */}
        <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950">
              <Activity className="size-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-black tracking-tight">OncoCare</span>
          </div>

          {/* Desktop logo (top of form) */}
          <div className="mb-8 hidden items-center gap-2.5 lg:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950">
              <Activity className="size-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-black tracking-tight">OncoCare</span>
          </div>

          <div className="w-full max-w-[380px]">
            {/* ── Heading ── */}
            <div className="mb-7 text-center">
              <h1 className="mb-1.5 font-serif text-[2rem] font-black leading-tight tracking-[-0.02em] text-slate-950">
                {isLogin && "Bem-vindo de volta"}
                {isCadastro && "Crie sua conta"}
                {isReset && "Recuperar senha"}
              </h1>
              <p className="text-[0.9375rem] text-slate-500">
                {isLogin && "Insira seus dados para acessar o sistema."}
                {isCadastro && "Preencha os campos para criar o seu acesso."}
                {isReset && "Enviaremos um link para redefinir sua senha."}
              </p>
            </div>

            {/* ── Login form ── */}
            {isLogin && (
              <form onSubmit={signIn} noValidate>
                <div className="mb-4 space-y-1">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="email-login">
                    E-mail
                  </label>
                  <input
                    id="email-login"
                    className="auth-input"
                    type="email"
                    autoComplete="username"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3 space-y-1">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="password-login">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password-login"
                      className="auth-input pr-10"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="mb-6 flex items-center justify-between">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 select-none">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    Lembrar-me
                  </label>
                  <button
                    type="button"
                    className="text-sm font-medium text-slate-700 hover:text-slate-950 underline-offset-2 hover:underline"
                    onClick={() => resetForm("reset")}
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                {authError && (
                  <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert" aria-live="assertive">
                    {authError}
                  </p>
                )}

                <button type="submit" className="auth-btn-primary mb-5" disabled={authBusy}>
                  {authBusy && <Loader2 className="size-4 animate-spin" />}
                  {authBusy ? "Aguarde…" : "Entrar"}
                </button>

                <p className="text-center text-[0.875rem] text-slate-500">
                  Não tem conta?{" "}
                  <button
                    type="button"
                    className="font-semibold text-slate-900 hover:underline underline-offset-2"
                    onClick={() => resetForm("cadastro")}
                  >
                    Cadastre-se
                  </button>
                </p>
              </form>
            )}

            {/* ── Signup form ── */}
            {isCadastro && (
              <form onSubmit={signUp} noValidate>
                <div className="mb-4 space-y-1">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="name-signup">
                    Nome completo
                  </label>
                  <input
                    id="name-signup"
                    className="auth-input"
                    type="text"
                    autoComplete="name"
                    placeholder="Dr. Ana Martins"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-4 space-y-1">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="email-signup">
                    E-mail
                  </label>
                  <input
                    id="email-signup"
                    className="auth-input"
                    type="email"
                    autoComplete="username"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-6 space-y-1">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="password-signup">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password-signup"
                      className="auth-input pr-10"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert" aria-live="assertive">
                    {authError}
                  </p>
                )}
                {authInfo && (
                  <p className="mb-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700" role="status" aria-live="polite">
                    {authInfo}
                  </p>
                )}

                <button type="submit" className="auth-btn-primary mb-5" disabled={authBusy}>
                  {authBusy && <Loader2 className="size-4 animate-spin" />}
                  {authBusy ? "Criando conta…" : "Criar conta demo"}
                </button>

                <p className="text-center text-[0.875rem] text-slate-500">
                  Já tem conta?{" "}
                  <button
                    type="button"
                    className="font-semibold text-slate-900 hover:underline underline-offset-2"
                    onClick={() => resetForm("login")}
                  >
                    Entrar
                  </button>
                </p>
              </form>
            )}

            {/* ── Reset password form ── */}
            {isReset && (
              <form onSubmit={requestPasswordReset} noValidate>
                <div className="mb-6 space-y-1">
                  <label className="block text-sm font-medium text-slate-700" htmlFor="email-reset">
                    E-mail
                  </label>
                  <input
                    id="email-reset"
                    className="auth-input"
                    type="email"
                    autoComplete="username"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {authError && (
                  <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600" role="alert" aria-live="assertive">
                    {authError}
                  </p>
                )}
                {authInfo && (
                  <p className="mb-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700" role="status" aria-live="polite">
                    {authInfo}
                  </p>
                )}

                <button type="submit" className="auth-btn-primary mb-5" disabled={authBusy}>
                  {authBusy && <Loader2 className="size-4 animate-spin" />}
                  {authBusy ? "Enviando…" : "Enviar link de recuperação"}
                </button>

                <p className="text-center text-[0.875rem] text-slate-500">
                  Lembrou a senha?{" "}
                  <button
                    type="button"
                    className="font-semibold text-slate-900 hover:underline underline-offset-2"
                    onClick={() => resetForm("login")}
                  >
                    Voltar ao login
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isTvRoute = pathname.startsWith("/tv/");
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [queryClient] = useState(() => makeQueryClient());

  useEffect(() => {
    let cancelled = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => {
      void (async () => {
        const fresh = await refreshSupabaseSessionIfStale(sess);
        if (!cancelled) {
          setSession(fresh);
          setAuthChecked(true);
        }
      })();
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (isTvRoute && authChecked) {
    return (
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary title="OncoCare — erro">
          {session ? (
            <OncoCareProvider session={session}>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </OncoCareProvider>
          ) : (
            <>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </>
          )}
        </ErrorBoundary>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary title="OncoCare — erro">
        {authChecked ? (
          !session ? (
            <>
              <OncoCareAuthScreen />
              <Toaster position="top-right" richColors closeButton />
            </>
          ) : (
            <OncoCareProvider session={session}>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </OncoCareProvider>
          )
        ) : (
          <AuthSessionSplash />
        )}
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
