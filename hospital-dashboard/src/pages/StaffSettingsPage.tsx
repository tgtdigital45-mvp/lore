import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Building2,
  Check,
  Image as ImageIcon,
  KeyRound,
  Mail,
  Palette,
  RotateCcw,
  Save,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatAuthError } from "@/authErrors";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import { useOncoCare } from "@/context/OncoCareContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  loadDashboardSettings,
  saveDashboardSettings,
  resetDashboardSettings,
  SIDEBAR_BG_PRESETS,
  APP_BG_PRESETS,
} from "@/lib/dashboardSettings";

function Feedback({ msg, err }: { msg: string | null; err: string | null }) {
  if (!msg && !err) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-2 rounded-2xl border-[3px] px-4 py-3 text-sm font-medium",
        err
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      {err ? null : <Check className="size-4 shrink-0" />}
      {err ?? msg}
    </motion.div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden rounded-[24px] border-[3px] border-[#F3F4F6] shadow-sm", className)}>
      <CardHeader className="border-b border-[#F3F4F6] bg-[#FAFBFC] px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white shadow-card">
            <Icon className="size-4 text-slate-600" />
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-bold">{title}</CardTitle>
            {description && <CardDescription className="mt-0.5 text-xs leading-snug">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">{children}</CardContent>
    </Card>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
  presets,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  presets: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button
              key={p.value}
              type="button"
              title={p.label}
              onClick={() => onChange(p.value)}
              className={cn(
                "h-8 w-8 rounded-xl border-[2px] shadow-sm transition hover:scale-105 sm:h-9 sm:w-9",
                value === p.value ? "border-[#1A1A1A] ring-2 ring-[#1A1A1A]/25" : "border-[#E2E8F0]"
              )}
              style={{ backgroundColor: p.value }}
              aria-label={p.label}
            />
          ))}
          <label
            title="Cor personalizada"
            className={cn(
              "flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border-[2px] border-dashed border-[#CBD5E1] sm:h-9 sm:w-9",
              !presets.some((p) => p.value === value) ? "border-[#1A1A1A] ring-2 ring-[#1A1A1A]/15" : ""
            )}
          >
            <Palette className="size-3.5 text-slate-500" />
            <input type="color" className="sr-only" value={value} onChange={(e) => onChange(e.target.value)} />
          </label>
        </div>
        <div className="flex h-8 min-w-[7.5rem] flex-1 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-2 sm:max-w-[10rem]">
          <span
            className="inline-block h-3.5 w-3.5 shrink-0 rounded border border-[#E2E8F0]"
            style={{ backgroundColor: value }}
          />
          <span className="truncate font-mono text-[0.65rem] text-muted-foreground">{value}</span>
        </div>
      </div>
    </div>
  );
}

export function StaffSettingsPage() {
  const { reloadStaffProfile } = useOncoCare();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [hospitalName, setHospitalName] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [sidebarBg, setSidebarBg] = useState("#f0f1f3");
  const [appBg, setAppBg] = useState("#f3f4f6");
  const [visualSaved, setVisualSaved] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const { data: s } = await supabase.auth.getSession();
      const u = s.session?.user;
      setEmail(u?.email ?? "");
      const uid = u?.id;
      if (!uid) return;
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
      setFullName(typeof prof?.full_name === "string" ? prof.full_name : "");
    })();

    const ds = loadDashboardSettings();
    setHospitalName(ds.hospitalName);
    setLogoDataUrl(ds.logoDataUrl);
    setSidebarBg(ds.sidebarBg);
    setAppBg(ds.appBg);
  }, []);

  function feedback(m: string | null, e: string | null = null) {
    setMsg(m);
    setErr(e);
    if (m || e) {
      setTimeout(() => {
        setMsg(null);
        setErr(null);
      }, 5000);
    }
  }

  function handleLogoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      feedback(null, "A imagem deve ter no máximo 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setLogoDataUrl(url);
    };
    reader.readAsDataURL(file);
  }

  function saveVisualSettings() {
    saveDashboardSettings({
      hospitalName: hospitalName.trim() || "Hospital",
      logoDataUrl,
      sidebarBg,
      appBg,
    });
    setVisualSaved(true);
    setTimeout(() => setVisualSaved(false), 2200);
  }

  function handleResetVisual() {
    const ds = resetDashboardSettings();
    setHospitalName(ds.hospitalName);
    setLogoDataUrl(ds.logoDataUrl);
    setSidebarBg(ds.sidebarBg);
    setAppBg(ds.appBg);
  }

  async function saveName(e: FormEvent) {
    e.preventDefault();
    feedback(null);
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    if (!uid) return;
    const t = fullName.trim();
    if (!t) {
      feedback(null, "Informe o nome.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: t }).eq("id", uid);
    setBusy(false);
    if (error) {
      feedback(null, sanitizeSupabaseError(error));
      return;
    }
    feedback("Nome atualizado com sucesso.");
    await reloadStaffProfile();
  }

  async function changeEmail(e: FormEvent) {
    e.preventDefault();
    feedback(null);
    const next = newEmail.trim().toLowerCase();
    if (!next || !next.includes("@")) {
      feedback(null, "Informe um e-mail válido.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: next });
    setBusy(false);
    if (error) {
      feedback(null, formatAuthError(error));
      return;
    }
    feedback("Verifique a caixa de entrada do novo e-mail para confirmar a alteração.");
    setNewEmail("");
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    feedback(null);
    if (passwordNew.length < 6) {
      feedback(null, "A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (passwordNew !== passwordConfirm) {
      feedback(null, "A confirmação não coincide com a nova senha.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: passwordNew });
    setBusy(false);
    if (error) {
      feedback(null, formatAuthError(error));
      return;
    }
    feedback("Senha atualizada com sucesso.");
    setPasswordNew("");
    setPasswordConfirm("");
  }

  function requestBrowserNotifications() {
    feedback(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      feedback(null, "Notificações do navegador não estão disponíveis neste ambiente.");
      return;
    }
    void Notification.requestPermission().then((p) => {
      if (p === "granted") feedback("Notificações permitidas neste navegador.");
      else if (p === "denied") feedback(null, "Permissão negada. Ative nas definições do navegador.");
      else feedback("Permissão não concedida.");
    });
  }

  const notifGranted = typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-10">
      {/* Cabeçalho da página */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <Button type="button" variant="outline" size="icon" className="mt-0.5 shrink-0 rounded-2xl border-[3px]" asChild>
            <Link to="/paciente" aria-label="Voltar ao painel">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Conta e configurações</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Personalize o painel, gerencie acesso e notificações.
            </p>
          </div>
        </div>
      </motion.div>

      <Feedback msg={msg} err={err} />

      {/* Bloco 1: Identidade visual — grelha larga + pré-visualização à direita (desktop) */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
        <Section
          icon={Building2}
          title="Identidade visual do painel"
          description="Logotipo, nome da instituição e cores da barra lateral e da área principal."
        >
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
            {/* Coluna esquerda: logo, nome, cores */}
            <div className="space-y-5 lg:col-span-7">
              <div className="flex flex-wrap items-start gap-4">
                <div
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-[#E8ECF1] bg-[#F8FAFC] shadow-sm sm:h-[72px] sm:w-[72px]"
                >
                  {logoDataUrl ? (
                    <img src={logoDataUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="size-8 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleLogoFile}
                    aria-label="Selecionar logotipo"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" className="rounded-xl border-[3px]" onClick={() => logoInputRef.current?.click()}>
                      <ImageIcon className="mr-2 size-4" />
                      {logoDataUrl ? "Trocar logo" : "Enviar logo"}
                    </Button>
                    {logoDataUrl ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-[3px] border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => setLogoDataUrl(null)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Remover
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-[0.7rem] leading-snug text-muted-foreground">
                    Canto superior esquerdo da barra lateral. Máx. 2 MB — PNG, JPG ou SVG.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:max-w-xl">
                <label className="block text-sm font-medium">
                  Nome da instituição
                  <Input
                    className="mt-1.5 rounded-2xl border-[3px] border-[#E8ECF1]"
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="Nome da clínica ou hospital"
                    maxLength={60}
                  />
                </label>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 sm:gap-4">
                <ColorPicker label="Fundo da barra lateral" value={sidebarBg} onChange={setSidebarBg} presets={SIDEBAR_BG_PRESETS} />
                <ColorPicker label="Fundo do aplicativo" value={appBg} onChange={setAppBg} presets={APP_BG_PRESETS} />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-[#F3F4F6] pt-4">
                <Button type="button" className="rounded-2xl bg-[#0A0A0A] font-bold hover:bg-[#1A1A1A]" onClick={saveVisualSettings}>
                  {visualSaved ? (
                    <>
                      <Check className="mr-2 size-4" />
                      Salvo!
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 size-4" />
                      Aplicar visual
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" size="sm" className="rounded-2xl border-[3px]" onClick={handleResetVisual}>
                  <RotateCcw className="mr-2 size-3.5" />
                  Restaurar padrão
                </Button>
              </div>
            </div>

            {/* Pré-visualização — coluna direita, sticky em desktop */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-24">
                <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Pré-visualização</p>
                <div className="overflow-hidden rounded-2xl border-[3px] border-[#E8ECF1] shadow-sm">
                  <div className="flex h-[min(200px,28vh)] min-h-[120px] items-stretch sm:h-36">
                    <div
                      className="flex w-[38%] min-w-[100px] shrink-0 flex-col justify-center border-r border-[#E8ECF1] px-3 py-2"
                      style={{ backgroundColor: sidebarBg }}
                    >
                      <div className="flex items-center gap-2">
                        {logoDataUrl ? (
                          <img src={logoDataUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-700">
                            <span className="text-[0.5rem] font-black text-white">OC</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[0.55rem] font-bold uppercase text-slate-500">OncoCare</p>
                          <p className="truncate text-[0.65rem] font-bold leading-tight text-slate-800">{hospitalName || "Hospital"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-1 items-center justify-center px-2" style={{ backgroundColor: appBg }}>
                      <p className="text-center text-[0.7rem] font-medium text-slate-500">Área principal do painel</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </motion.div>

      {/* Bloco 2: Perfil | E-mail — duas colunas em lg */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <Section icon={User} title="Perfil pessoal" description="Nome na barra superior e nas ações da equipe.">
            <form className="space-y-3" onSubmit={saveName}>
              <label className="block text-sm font-medium">
                Nome completo
                <Input
                  className="mt-1.5 rounded-2xl border-[3px]"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  placeholder="Seu nome completo"
                />
              </label>
              <Button type="submit" className="rounded-2xl" disabled={busy}>
                <Save className="mr-2 size-4" />
                {busy ? "A guardar…" : "Guardar nome"}
              </Button>
            </form>
          </Section>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Section icon={Mail} title="E-mail de acesso" description={`Atual: ${email || "—"}`}>
            <form className="space-y-3" onSubmit={changeEmail}>
              <label className="block text-sm font-medium">
                Novo e-mail
                <Input
                  type="email"
                  className="mt-1.5 rounded-2xl border-[3px]"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="novo@hospital.com"
                />
              </label>
              <Button type="submit" variant="secondary" className="rounded-2xl" disabled={busy}>
                <Mail className="mr-2 size-4" />
                Pedir alteração de e-mail
              </Button>
            </form>
          </Section>
        </motion.div>
      </div>

      {/* Bloco 3: Segurança | Notificações */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Section icon={Shield} title="Segurança" description="Nova senha para esta conta.">
            <form className="space-y-3" onSubmit={changePassword}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium sm:col-span-1">
                  Nova senha
                  <Input
                    type="password"
                    className="mt-1.5 rounded-2xl border-[3px]"
                    value={passwordNew}
                    onChange={(e) => setPasswordNew(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    placeholder="Mín. 6 caracteres"
                  />
                </label>
                <label className="block text-sm font-medium sm:col-span-1">
                  Confirmar
                  <Input
                    type="password"
                    className="mt-1.5 rounded-2xl border-[3px]"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
                    placeholder="Repetir senha"
                  />
                </label>
              </div>
              {passwordNew.length > 0 && passwordConfirm.length > 0 && passwordNew !== passwordConfirm ? (
                <p className="text-xs text-rose-600">As senhas não coincidem.</p>
              ) : null}
              <Button
                type="submit"
                variant="secondary"
                className="rounded-2xl"
                disabled={busy || (passwordNew.length > 0 && passwordNew !== passwordConfirm)}
              >
                <KeyRound className="mr-2 size-4" />
                Atualizar senha
              </Button>
            </form>
          </Section>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Section
            icon={Bell}
            title="Notificações"
            description="Alertas no painel em tempo real. Para lembretes fora do site, use o navegador."
          >
            <div className="space-y-3">
              {notifGranted ? (
                <div className="flex items-center gap-2 rounded-2xl border-[3px] border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  <Check className="size-4 shrink-0" />
                  Notificações ativas neste navegador.
                </div>
              ) : null}
              <Button type="button" variant="outline" className="w-full rounded-2xl border-[3px] sm:w-auto" onClick={requestBrowserNotifications}>
                <Bell className="mr-2 size-4" />
                Ativar notificações do navegador
              </Button>
            </div>
          </Section>
        </motion.div>
      </div>
    </div>
  );
}
