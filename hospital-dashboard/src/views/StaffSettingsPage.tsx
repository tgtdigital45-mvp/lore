"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
  ScrollText,
  Settings2,
  Shield,
  Trash2,
  User,
  Stethoscope,
  LogOut,
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
import { tabPanelVariants } from "@/lib/motionPresets";
import { AuditLogList } from "@/components/settings/AuditLogList";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

const SETTINGS_TAB_IDS = ["perfil", "personalizacao", "notificacoes", "seguranca", "auditoria"] as const;
export type SettingsTabId = (typeof SETTINGS_TAB_IDS)[number];

function isSettingsTab(s: string | null): s is SettingsTabId {
  return s !== null && (SETTINGS_TAB_IDS as readonly string[]).includes(s);
}

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
    <Card className={cn("overflow-hidden rounded-[24px] border-[3px] border-[#F3F4F6] shadow-sm backdrop-blur-sm", className)}>
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

const NAV_ITEMS: { id: SettingsTabId; label: string; icon: React.ElementType }[] = [
  { id: "perfil", label: "Perfil", icon: User },
  { id: "personalizacao", label: "Personalização", icon: Settings2 },
  { id: "notificacoes", label: "Notificações", icon: Bell },
  { id: "seguranca", label: "Segurança", icon: Shield },
  { id: "auditoria", label: "Auditoria", icon: ScrollText },
];

export function StaffSettingsPage() {
  const { reloadStaffProfile, hospitalsMeta } = useOncoCare();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() || "";
  const tabParam = searchParams.get("tab");
  const activeTab: SettingsTabId = isSettingsTab(tabParam) ? tabParam : "perfil";

  const setTab = useCallback(
    (id: SettingsTabId) => {
      if (id === "perfil") router.replace(pathname, { scroll: false });
      else {
        const p = new URLSearchParams();
        p.set("tab", id);
        router.replace(`${pathname}?${p.toString()}`, { scroll: false });
      }
    },
    [router, pathname]
  );

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [professionalLicense, setProfessionalLicense] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [assignments, setAssignments] = useState<{ hospitalId: string; name: string }[]>([]);

  const [hospitalName, setHospitalName] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [sidebarBg, setSidebarBg] = useState("#f0f1f3");
  const [appBg, setAppBg] = useState("#f3f4f6");
  const [visualSaved, setVisualSaved] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const u = s.session?.user;
      setEmail(u?.email ?? "");
      const uid = u?.id;
      if (!uid) {
        setAssignments([]);
        return;
      }
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, professional_license, specialty")
        .eq("id", uid)
        .maybeSingle();
      setFullName(typeof prof?.full_name === "string" ? prof.full_name : "");
      setAvatarUrl(typeof prof?.avatar_url === "string" ? prof.avatar_url : null);
      setProfessionalLicense(typeof prof?.professional_license === "string" ? prof.professional_license : "");
      setSpecialty(typeof prof?.specialty === "string" ? prof.specialty : "");

      const { data: assigns } = await supabase
        .from("staff_assignments")
        .select("hospital_id, hospitals ( name, display_name )")
        .eq("staff_id", uid);
      const list: { hospitalId: string; name: string }[] = [];
      for (const row of assigns ?? []) {
        const raw = row as {
          hospital_id: string;
          hospitals:
            | { name?: string; display_name?: string | null }
            | { name?: string; display_name?: string | null }[]
            | null;
        };
        const h = raw.hospitals;
        const h0 = Array.isArray(h) ? h[0] : h;
        const name = (h0?.display_name?.trim() || h0?.name || "Hospital").trim();
        list.push({ hospitalId: raw.hospital_id, name });
      }
      setAssignments(list);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    const ds = loadDashboardSettings();
    setHospitalName(ds.hospitalName);
    setLogoDataUrl(ds.logoDataUrl);
    setSidebarBg(ds.sidebarBg);
    setAppBg(ds.appBg);
  }, [loadProfile]);

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

  async function handleAvatarFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      feedback(null, "Selecione uma imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      feedback(null, "A imagem deve ter no máximo 2 MB.");
      return;
    }
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    if (!uid) return;
    setBusy(true);
    const safe = file.name.replace(/\s+/g, "_");
    const path = `${uid}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setBusy(false);
      feedback(null, sanitizeSupabaseError(upErr));
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = pub.publicUrl;
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", uid);
    setBusy(false);
    if (dbErr) {
      feedback(null, sanitizeSupabaseError(dbErr));
      return;
    }
    setAvatarUrl(publicUrl);
    feedback("Foto de perfil atualizada.");
    await reloadStaffProfile();
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

  async function saveProfessional(e: FormEvent) {
    e.preventDefault();
    feedback(null);
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    if (!uid) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        professional_license: professionalLicense.trim() || null,
        specialty: specialty.trim() || null,
      })
      .eq("id", uid);
    setBusy(false);
    if (error) {
      feedback(null, sanitizeSupabaseError(error));
      return;
    }
    feedback("Dados profissionais guardados.");
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

  async function signOutAllSessions() {
    feedback(null);
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    setBusy(false);
    if (error) {
      feedback(null, formatAuthError(error));
      return;
    }
    window.location.href = "/";
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 pb-10 lg:flex-row lg:items-start lg:gap-8">
      {/* Navegação lateral (desktop) + select (mobile) */}
      <aside className="w-full shrink-0 lg:w-52">
        <div className="flex items-start gap-3 lg:hidden">
          <Button type="button" variant="outline" size="icon" className="mt-0.5 shrink-0 rounded-2xl border-[3px]" asChild>
            <Link href="/inicio" aria-label="Voltar ao painel">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black tracking-tight">Conta</h1>
            <label className="mt-2 block text-xs font-medium text-muted-foreground" htmlFor="settings-tab">
              Secção
            </label>
            <select
              id="settings-tab"
              className="mt-1 w-full rounded-2xl border-[3px] border-[#E8ECF1] bg-white px-3 py-2 text-sm font-medium"
              value={activeTab}
              onChange={(e) => setTab(e.target.value as SettingsTabId)}
            >
              {NAV_ITEMS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <nav className="mt-4 hidden flex-col gap-1 lg:flex" aria-label="Secções de configuração">
          <div className="mb-4 flex items-start gap-3">
            <Button type="button" variant="outline" size="icon" className="mt-0.5 shrink-0 rounded-2xl border-[3px]" asChild>
              <Link href="/inicio" aria-label="Voltar ao painel">
                <ArrowLeft className="size-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Conta</h1>
              <p className="mt-1 text-xs text-muted-foreground">Perfil, UI e conformidade</p>
            </div>
          </div>
          {NAV_ITEMS.map((n) => {
            const Icon = n.icon;
            const on = activeTab === n.id;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => setTab(n.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-2xl border-[3px] px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                  on
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-transparent bg-transparent text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {n.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="hidden lg:block">
          <h2 className="text-2xl font-black tracking-tight capitalize text-slate-900">
            {NAV_ITEMS.find((x) => x.id === activeTab)?.label}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTab === "perfil" && "Identidade profissional e lotação hospitalar."}
            {activeTab === "personalizacao" && "Identidade visual local do painel (este navegador)."}
            {activeTab === "notificacoes" && "Canais de alerta e integrações por hospital."}
            {activeTab === "seguranca" && "Senha e terminação de sessões."}
            {activeTab === "auditoria" && "Trilha de acessos a prontuários (imutável)."}
          </p>
        </motion.div>

        <Feedback msg={msg} err={err} />

        {profileLoading ? (
          <div className="space-y-6" aria-busy aria-label="Carregando perfil">
            <span className="sr-only">Carregando perfil…</span>
            <SkeletonPulse rounded="3xl" className="h-56 w-full" />
            <SkeletonPulse rounded="3xl" className="h-40 w-full" />
            <SkeletonPulse rounded="3xl" className="h-64 w-full" />
          </div>
        ) : (
        <AnimatePresence mode="wait">
          {activeTab === "perfil" ? (
            <motion.div
              key="perfil"
              variants={tabPanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="grid gap-6 lg:grid-cols-5"
            >
              <div className="space-y-6 lg:col-span-3">
                <Section icon={User} title="Identidade e credenciais" description="Nome, registo profissional e especialidade.">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-[#E8ECF1] bg-[#F8FAFC]">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="size-10 text-slate-300" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleAvatarFile}
                        aria-label="Carregar foto de perfil"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-[3px]"
                        disabled={busy}
                        onClick={() => avatarInputRef.current?.click()}
                      >
                        <ImageIcon className="mr-2 size-4" />
                        {avatarUrl ? "Alterar foto" : "Carregar foto"}
                      </Button>
                      <p className="text-[0.7rem] text-muted-foreground">Bucket avatars — máx. 2 MB.</p>
                    </div>
                  </div>

                  <form className="mt-6 space-y-4" onSubmit={saveName}>
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

                  <form className="mt-6 space-y-4 border-t border-[#F3F4F6] pt-6" onSubmit={saveProfessional}>
                    <label className="block text-sm font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Stethoscope className="size-3.5 text-slate-500" />
                        CRM / COREN / Registo
                      </span>
                      <Input
                        className="mt-1.5 rounded-2xl border-[3px]"
                        value={professionalLicense}
                        onChange={(e) => setProfessionalLicense(e.target.value)}
                        placeholder="Ex.: CRM 12345 SP"
                      />
                    </label>
                    <label className="block text-sm font-medium">
                      Especialidade / cargo
                      <Input
                        className="mt-1.5 rounded-2xl border-[3px]"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder="Ex.: Oncologia clínica"
                      />
                    </label>
                    <Button type="submit" variant="secondary" className="rounded-2xl" disabled={busy}>
                      <Save className="mr-2 size-4" />
                      Guardar dados profissionais
                    </Button>
                  </form>
                </Section>

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
              </div>

              <div className="space-y-6 lg:col-span-2">
                <Section icon={Building2} title="Lotação atual" description="Unidades onde está vinculado (staff_assignments).">
                  {assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem lotações registadas.</p>
                  ) : (
                    <ul className="space-y-2">
                      {assignments.map((a) => (
                        <li key={a.hospitalId} className="rounded-2xl border border-[#E8ECF1] bg-white px-4 py-3 text-sm font-medium">
                          {a.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>

                <Section
                  icon={Bell}
                  title="Preferências de alerta"
                  description="Alertas críticos (ex.: nadir + febre) aparecem no painel em tempo real."
                >
                  <p className="text-sm text-muted-foreground">
                    Configure notificações do navegador na secção <strong>Notificações</strong>. Integrações WhatsApp/webhook são
                    definidas ao nível do hospital.
                  </p>
                </Section>
              </div>
            </motion.div>
          ) : null}

          {activeTab === "personalizacao" ? (
            <motion.div key="personalizacao" variants={tabPanelVariants} initial="hidden" animate="visible" exit="exit">
              <Section
                icon={Building2}
                title="Identidade visual do painel"
                description="Logotipo, nome da instituição e cores da barra lateral e da área principal (armazenado localmente neste dispositivo)."
              >
                <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
                  <div className="space-y-5 lg:col-span-7">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-[#E8ECF1] bg-[#F8FAFC] shadow-sm sm:h-[72px] sm:w-[72px]">
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
          ) : null}

          {activeTab === "notificacoes" ? (
            <motion.div key="notificacoes" variants={tabPanelVariants} initial="hidden" animate="visible" exit="exit" className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <Section
                  icon={Bell}
                  title="Notificações no navegador"
                  description="Alertas em tempo real enquanto o painel estiver aberto ou em segundo plano (consoante o navegador)."
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
                    <p className="text-xs text-muted-foreground">
                      E-mail e WhatsApp para alertas clínicos dependem das integrações configuradas no hospital (ver abaixo).
                    </p>
                  </div>
                </Section>
              </div>
              <div className="lg:col-span-2">
                <Section icon={Building2} title="Integrações por hospital" description="Webhooks e canais configurados ao nível da instituição.">
                  {hospitalsMeta.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem metadados de hospital carregados.</p>
                  ) : (
                    <ul className="space-y-3">
                      {hospitalsMeta.map((h) => (
                        <li key={h.id} className="rounded-2xl border border-[#E8ECF1] bg-[#FAFBFC] px-3 py-2 text-xs">
                          <p className="font-bold text-slate-800">{h.display_name?.trim() || h.name}</p>
                          <p className="mt-1 text-muted-foreground">
                            Webhook alertas: {h.alert_webhook_url ? "configurado" : "não definido"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Section>
              </div>
            </motion.div>
          ) : null}

          {activeTab === "seguranca" ? (
            <motion.div key="seguranca" variants={tabPanelVariants} initial="hidden" animate="visible" exit="exit" className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <Section icon={Shield} title="Senha" description="Nova senha para esta conta.">
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
              </div>
              <div className="lg:col-span-2">
                <Section icon={LogOut} title="Sessões" description="Terminar todas as sessões desta conta (outros dispositivos).">
                  <p className="mb-4 text-sm text-muted-foreground">
                    Encerra a sessão em todos os dispositivos onde iniciou sessão com esta conta. Terá de voltar a autenticar-se.
                  </p>
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-2xl"
                    disabled={busy}
                    onClick={() => void signOutAllSessions()}
                  >
                    <LogOut className="mr-2 size-4" />
                    Encerrar todas as sessões
                  </Button>
                </Section>
              </div>
            </motion.div>
          ) : null}

          {activeTab === "auditoria" ? (
            <motion.div key="auditoria" variants={tabPanelVariants} initial="hidden" animate="visible" exit="exit">
              <Section
                icon={ScrollText}
                title="Trilha de auditoria"
                description="Registos imutáveis de ações sobre prontuários (conforme permissões da sua lotação)."
              >
                <AuditLogList />
              </Section>
            </motion.div>
          ) : null}
        </AnimatePresence>
        )}
      </div>
    </div>
  );
}
