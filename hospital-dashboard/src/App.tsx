import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, Route, Routes } from "react-router-dom";
import { Activity, Eye, EyeOff, Loader2 } from "lucide-react";
import { refreshSupabaseSessionIfStale } from "./lib/authSession";
import { supabase } from "./lib/supabase";
import { formatAuthError } from "./authErrors";
import { ensureStaffIfPending, setPendingStaffRole } from "./staffLink";
import { OncoCareProvider, useOncoCare } from "./context/OncoCareContext";
import { getPanelDefaultPath } from "./lib/panelDefaultPath";
import { OncoCareLayout } from "./components/oncocare/OncoCareLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";

const TriageWorkspaceLayout = lazy(() =>
  import("./pages/TriageWorkspaceLayout").then((m) => ({ default: m.TriageWorkspaceLayout }))
);
const DashboardWorkspacePlaceholder = lazy(() =>
  import("./pages/DashboardWorkspacePlaceholder").then((m) => ({ default: m.DashboardWorkspacePlaceholder }))
);
const OncoCarePatientsPage = lazy(() =>
  import("./pages/OncoCarePatientsPage").then((m) => ({ default: m.OncoCarePatientsPage }))
);
const OncoCareAgendaPage = lazy(() =>
  import("./pages/OncoCareAgendaPage").then((m) => ({ default: m.OncoCareAgendaPage }))
);
const OncoCareResourceDetailPage = lazy(() =>
  import("./pages/OncoCareResourceDetailPage").then((m) => ({ default: m.OncoCareResourceDetailPage }))
);
const PatientDossierRoute = lazy(() =>
  import("./pages/PatientDossierRoute").then((m) => ({ default: m.PatientDossierRoute }))
);
const StaffSettingsPage = lazy(() =>
  import("./pages/StaffSettingsPage").then((m) => ({ default: m.StaffSettingsPage }))
);
const HospitalSettingsPage = lazy(() =>
  import("./pages/HospitalSettingsPage").then((m) => ({ default: m.HospitalSettingsPage }))
);
const InfusionOpsDashboardPage = lazy(() =>
  import("./pages/InfusionOpsDashboardPage").then((m) => ({ default: m.InfusionOpsDashboardPage }))
);
const InfusionOpsDisplayPage = lazy(() =>
  import("./pages/InfusionOpsDisplayPage").then((m) => ({ default: m.InfusionOpsDisplayPage }))
);
const MensagensWorkspacePage = lazy(() =>
  import("./pages/MensagensWorkspacePage").then((m) => ({ default: m.MensagensWorkspacePage }))
);
const EquipeClinicaPage = lazy(() =>
  import("./pages/EquipeClinicaPage").then((m) => ({ default: m.EquipeClinicaPage }))
);

/** Evita flash da tela de login no F5: aguarda o primeiro evento de auth. */
function AuthSessionSplash() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface-app px-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="size-10 animate-spin text-teal-600" aria-hidden />
      <p className="text-sm font-medium text-slate-600">Verificando sessão…</p>
    </div>
  );
}

function OncoCareAuthScreen() {
  const [authView, setAuthView] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleAuthViewChange(view: "login" | "cadastro") {
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
    if (!fullName.trim()) {
      setAuthError("Informe o nome completo.");
      return;
    }
    setAuthBusy(true);
    setPendingStaffRole("hospital_admin");
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) {
      setAuthError(formatAuthError(error));
      setAuthBusy(false);
      return;
    }
    if (data.session) {
      setAuthInfo("Conta criada e vinculada ao hospital demo. Você já pode usar a triagem.");
      await ensureStaffIfPending();
    } else {
      setAuthInfo(
        "Enviamos um link de confirmação. Após confirmar o e-mail e entrar, seu perfil será vinculado ao hospital demo automaticamente."
      );
    }
    setAuthBusy(false);
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12"
      style={{
        background: "linear-gradient(135deg, #e8eef9 0%, #f0e8ff 40%, #e5f5f0 100%)",
      }}
    >
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute left-[-10%] top-[-10%] h-[70vh] w-[60vw] rounded-full bg-blue-200/50 blur-[120px]" />
        <div className="absolute right-[-5%] top-[-5%] h-[50vh] w-[50vw] rounded-full bg-violet-200/60 blur-[100px]" />
        <div className="absolute bottom-[-5%] right-[20%] h-[50vh] w-[45vw] rounded-full bg-emerald-100/50 blur-[100px]" />
      </div>
      <a href="#login-card" className="skip-link">
        Ir para o formulário
      </a>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-primary-foreground shadow-md">
          <Activity className="size-7" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OncoCare</p>
          <p className="text-xl font-black tracking-tight">Hospital</p>
        </div>
      </div>
      <Card
        id="login-card"
        className="w-full max-w-md rounded-[32px] border border-white/60 bg-white/70 shadow-[0_8px_32px_rgba(31,38,135,0.12)] backdrop-blur-md"
      >
        <CardHeader>
          <CardTitle className="text-2xl font-black">Acesso à equipe</CardTitle>
          <CardDescription>Triagem e prontuário — ambiente hospitalar demo Aura.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={authView === "login" ? "default" : "outline"}
              className="flex-1 rounded-2xl"
              onClick={() => handleAuthViewChange("login")}
            >
              Entrar
            </Button>
            <Button
              type="button"
              variant={authView === "cadastro" ? "default" : "outline"}
              className="flex-1 rounded-2xl"
              onClick={() => handleAuthViewChange("cadastro")}
            >
              Cadastro
            </Button>
          </div>
          {authView === "login" ? (
            <form className="space-y-3" onSubmit={signIn}>
              <label className="block text-sm font-medium">
                E-mail
                <Input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </label>
              <label className="block text-sm font-medium">
                Senha
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>
              {authError ? (
                <p className="text-sm text-destructive" role="alert" aria-live="assertive" aria-atomic="true">
                  {authError}
                </p>
              ) : null}
              {authInfo ? (
                <p className="text-sm text-clinical-success" role="status" aria-live="polite">
                  {authInfo}
                </p>
              ) : null}
              <Button type="submit" className="w-full rounded-2xl" disabled={authBusy}>
                {authBusy ? "Aguarde…" : "Entrar"}
              </Button>
            </form>
          ) : (
            <form className="space-y-3" onSubmit={signUp}>
              <label className="block text-sm font-medium">
                Nome completo
                <Input type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1" />
              </label>
              <label className="block text-sm font-medium">
                E-mail
                <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
              </label>
              <label className="block text-sm font-medium">
                Senha
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>
              {authError ? (
                <p className="text-sm text-destructive" role="alert" aria-live="assertive" aria-atomic="true">
                  {authError}
                </p>
              ) : null}
              {authInfo ? (
                <p className="text-sm text-clinical-success" role="status" aria-live="polite">
                  {authInfo}
                </p>
              ) : null}
              <Button type="submit" className="w-full rounded-2xl" disabled={authBusy}>
                {authBusy ? "Criando conta…" : "Criar conta demo"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DefaultPanelNavigate() {
  const { rows } = useOncoCare();
  const to = useMemo(() => getPanelDefaultPath(rows), [rows]);
  return <Navigate to={to} replace />;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

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

  if (!authChecked) {
    return <AuthSessionSplash />;
  }

  if (!session) {
    return <OncoCareAuthScreen />;
  }

  return (
    <OncoCareProvider session={session}>
      <Routes>
        <Route
          path="tv/operacao-infusao"
          element={
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-slate-100" role="status" aria-live="polite">
                  <Loader2 className="size-12 animate-spin text-teal-600" aria-hidden />
                </div>
              }
            >
              <InfusionOpsDisplayPage />
            </Suspense>
          }
        />
        <Route element={<OncoCareLayout />}>
          <Route index element={<DefaultPanelNavigate />} />
          <Route path="paciente" element={<TriageWorkspaceLayout />}>
            <Route index element={<DashboardWorkspacePlaceholder />} />
            <Route path=":patientId" element={<PatientDossierRoute />} />
          </Route>
          <Route path="pacientes" element={<OncoCarePatientsPage />} />
          <Route path="agenda" element={<OncoCareAgendaPage />} />
          <Route path="equipe-clinica" element={<EquipeClinicaPage />} />
          <Route path="mensagens" element={<MensagensWorkspacePage />} />
          <Route path="agenda/recurso/:resourceId" element={<OncoCareResourceDetailPage />} />
          <Route path="configuracoes" element={<HospitalSettingsPage />} />
          <Route path="operacao-infusao" element={<InfusionOpsDashboardPage />} />
          <Route path="conta" element={<StaffSettingsPage />} />
          <Route path="*" element={<DefaultPanelNavigate />} />
        </Route>
      </Routes>
    </OncoCareProvider>
  );
}
