import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Navigate, Route, Routes } from "react-router-dom";
import { refreshSupabaseSessionIfStale } from "./lib/authSession";
import { supabase } from "./lib/supabase";
import { formatAuthError } from "./authErrors";
import { ensureStaffIfPending, setPendingStaffRole } from "./staffLink";
import { OncoCareProvider } from "./context/OncoCareContext";
import { OncoCareLayout } from "./components/oncocare/OncoCareLayout";
import { OncoCareDashboardPage } from "./pages/OncoCareDashboardPage";
import { OncoCarePatientsPage } from "./pages/OncoCarePatientsPage";
import { OncoCareAgendaPage } from "./pages/OncoCareAgendaPage";
import { OncoCareResourceDetailPage } from "./pages/OncoCareResourceDetailPage";
import { PatientDossierPage } from "./pages/PatientDossierPage";
import { StaffSettingsPage } from "./pages/StaffSettingsPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Activity } from "lucide-react";

function OncoCareAuthScreen() {
  const [authView, setAuthView] = useState<"login" | "cadastro">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F0F2F5] px-4 py-12">
      <a href="#login-card" className="skip-link">
        Ir para o formulário
      </a>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A1A1A] text-white shadow-md">
          <Activity className="size-7" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OncoCare</p>
          <p className="text-xl font-black tracking-tight">Hospital</p>
        </div>
      </div>
      <Card id="login-card" className="w-full max-w-md rounded-[32px] border-[3px] border-[#F3F4F6] shadow-xl">
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
              onClick={() => setAuthView("login")}
            >
              Entrar
            </Button>
            <Button
              type="button"
              variant={authView === "cadastro" ? "default" : "outline"}
              className="flex-1 rounded-2xl"
              onClick={() => setAuthView("cadastro")}
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
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1"
                />
              </label>
              {authError ? <p className="text-sm text-[#B91C1C]">{authError}</p> : null}
              {authInfo ? <p className="text-sm text-[#059669]">{authInfo}</p> : null}
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
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1"
                />
              </label>
              {authError ? <p className="text-sm text-[#B91C1C]">{authError}</p> : null}
              {authInfo ? <p className="text-sm text-[#059669]">{authInfo}</p> : null}
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

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const fresh = await refreshSupabaseSessionIfStale(data.session);
      setSession(fresh);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!session) {
    return <OncoCareAuthScreen />;
  }

  return (
    <OncoCareProvider session={session}>
      <Routes>
        <Route element={<OncoCareLayout />}>
          <Route index element={<OncoCareDashboardPage />} />
          <Route path="pacientes" element={<OncoCarePatientsPage />} />
          <Route path="agenda" element={<OncoCareAgendaPage />} />
          <Route path="agenda/recurso/:resourceId" element={<OncoCareResourceDetailPage />} />
          <Route path="paciente/:patientId" element={<PatientDossierPage />} />
          <Route path="conta" element={<StaffSettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </OncoCareProvider>
  );
}
