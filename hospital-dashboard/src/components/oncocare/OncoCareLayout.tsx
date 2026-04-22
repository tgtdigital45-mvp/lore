import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  Armchair,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Users,
  Users2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useOncoCare } from "@/context/OncoCareContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { firstName, initialsFromName } from "@/lib/dashboardProfile";
import { supabase } from "@/lib/supabase";
import { loadDashboardSettings, saveSidebarCollapsed, loadSidebarCollapsed, type DashboardSettings } from "@/lib/dashboardSettings";
import { cn } from "@/lib/utils";
import { routeContentTransition } from "@/lib/motionPresets";
import { getPanelDefaultPath } from "@/lib/panelDefaultPath";
import { PageSkeleton } from "@/components/PageSkeleton";
import type { LucideIcon } from "lucide-react";

function useMinWidthLg() {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return matches;
}

type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };

function buildNavMain(panelPath: string): NavItem[] {
  return [
    { to: panelPath, label: "Painel", icon: LayoutDashboard, end: false },
    { to: "/pacientes", label: "Pacientes", icon: Users, end: false },
    { to: "/agenda", label: "Agenda", icon: CalendarDays, end: false },
    { to: "/equipe-clinica", label: "Equipe Clínica", icon: Users2, end: false },
  ];
}

function isNavActive(pathname: string, to: string, end?: boolean): boolean {
  if (to === "/configuracoes" && pathname.startsWith("/configuracoes")) return true;
  if (to === "/operacao-infusao" && pathname.startsWith("/operacao-infusao")) return true;
  if (to === "/agenda" && pathname.startsWith("/agenda")) return true;
  if (to === "/equipe-clinica" && pathname.startsWith("/equipe-clinica")) return true;
  /** Painel: link pode ser `/paciente` ou `/paciente/:id` (último dossiê / demo). */
  if (to === "/paciente" || to.startsWith("/paciente/")) {
    return pathname === "/paciente" || pathname.startsWith("/paciente/");
  }
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

type SidebarLinkProps = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  collapsed: boolean;
  pathname: string;
  isDesktop: boolean;
};

function SidebarLink({ to, label, icon: Icon, end, collapsed, pathname, isDesktop }: SidebarLinkProps) {
  const active = isNavActive(pathname, to, end);

  const linkClass = cn(
    "flex items-center gap-3 rounded-full py-2 text-sm transition-all duration-200 ease-out outline-none",
    "focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2",
    "px-3",
    collapsed && isDesktop && "lg:justify-center lg:gap-0 lg:px-2",
    active
      ? "bg-lime-200 font-semibold text-lime-950 shadow-sm"
      : "font-medium text-slate-600 hover:bg-white/90 hover:text-slate-900"
  );

  const inner = (
    <NavLink to={to} end={end} className={linkClass} aria-current={active ? "page" : undefined}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
          active ? "border-lime-500/35 bg-white/80" : "border-slate-200/90 bg-white shadow-sm"
        )}
      >
        <Icon className="size-[18px] shrink-0 opacity-95" strokeWidth={2} />
      </span>
      <span className={cn("min-w-0 truncate", collapsed && isDesktop && "lg:hidden")}>{label}</span>
    </NavLink>
  );

  if (collapsed && isDesktop) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
}

export function OncoCareLayout() {
  const { staffProfile, staffAvatarBust, reloadStaffProfile, patientSearch, setPatientSearch, rows, hospitalsMeta } = useOncoCare();
  const panelPath = useMemo(() => getPanelDefaultPath(rows), [rows]);
  const navMain = useMemo(() => buildNavMain(panelPath), [panelPath]);
  const location = useLocation();
  const pathname = location.pathname;

  const [settings, setSettings] = useState<DashboardSettings>(loadDashboardSettings);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(loadSidebarCollapsed);
  const isDesktop = useMinWidthLg();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<DashboardSettings>).detail;
      if (detail) setSettings(detail);
      else setSettings(loadDashboardSettings());
    };
    window.addEventListener("oncocare-settings-change", handler);
    return () => window.removeEventListener("oncocare-settings-change", handler);
  }, []);

  useEffect(() => {
    const onSb = (e: Event) => {
      const d = (e as CustomEvent<boolean>).detail;
      if (typeof d === "boolean") setSidebarCollapsed(d);
      else setSidebarCollapsed(loadSidebarCollapsed());
    };
    window.addEventListener("oncocare-sidebar-collapsed-change", onSb);
    return () => window.removeEventListener("oncocare-sidebar-collapsed-change", onSb);
  }, []);

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    saveSidebarCollapsed(next);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }
  const displayName = staffProfile?.full_name?.trim() || "Profissional";
  const initials = initialsFromName(displayName);
  const staffAvatarRaw = staffProfile?.avatar_url?.trim() ?? "";
  const staffAvatarUrl = /^https?:\/\//i.test(staffAvatarRaw) ? staffAvatarRaw : null;
  const staffAvatarSrc =
    staffAvatarUrl != null
      ? `${staffAvatarUrl}${staffAvatarUrl.includes("?") ? "&" : "?"}v=${staffAvatarBust}`
      : null;

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void reloadStaffProfile();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [reloadStaffProfile]);

  const brandHex = hospitalsMeta[0]?.brand_color_hex?.trim();
  useEffect(() => {
    if (brandHex && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(brandHex)) {
      document.documentElement.style.setProperty("--brand-primary", brandHex);
    }
  }, [brandHex]);

  /** Evita que o conteúdo “desça” por scroll residual ou por flex empilhar no fim da coluna. */
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  /** Reforço pós-paint: lazy + Suspense no Outlet monta depois; sem isto o 1.º acesso a /pacientes podia manter scroll errado. */
  useEffect(() => {
    const t = window.setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const accountActive = pathname === "/conta" || pathname.startsWith("/conta/");

  /** Troca só o conteúdo do Outlet na área triagem + dossiê; evita remount de toda a página ao abrir `/paciente/:id`. */
  const mainMotionKey =
    pathname === "/paciente" || pathname.startsWith("/paciente/")
      ? "workspace-triage"
      : pathname === "/mensagens" || pathname.startsWith("/mensagens/")
        ? "workspace-mensagens"
        : pathname;

  const accountLinkClass = cn(
    "flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-all duration-200 ease-out outline-none",
    "focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2",
    sidebarCollapsed && isDesktop && "lg:justify-center lg:gap-0 lg:px-2",
    accountActive
      ? "bg-lime-200 font-semibold text-lime-950 shadow-sm"
      : "font-medium text-slate-600 hover:bg-white/90 hover:text-slate-900"
  );

  const accountInner = (
    <NavLink to="/conta" className={accountLinkClass} aria-current={accountActive ? "page" : undefined}>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
          accountActive ? "border-lime-500/35 bg-white/80" : "border-slate-200/90 bg-white shadow-sm"
        )}
      >
        <Settings className="size-[18px] shrink-0 opacity-95" strokeWidth={2} />
      </span>
      <span className={cn("min-w-0 truncate", sidebarCollapsed && isDesktop && "lg:hidden")}>Conta</span>
    </NavLink>
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="flex min-h-screen w-full flex-col lg:flex-row"
        style={{
          background: `
      radial-gradient(ellipse 100% 85% at 14% 10%, rgba(243,252,203,0.78) 0%, transparent 58%),
      radial-gradient(ellipse 90% 70% at 96% 94%, rgba(255,236,234,0.55) 0%, transparent 55%),
      linear-gradient(135deg, #fbfcf7 0%, #f9f8f4 38%, #f8f3f3 72%, #f5f0ee 100%)
    `,
        }}
      >
        {/* Sidebar */}
        <aside
          className={cn(
            "flex w-full shrink-0 flex-col border-b border-slate-200/80 backdrop-blur-sm transition-[width] duration-300 ease-out",
            "lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:border-r-slate-200/60",
            sidebarCollapsed ? "lg:w-[76px]" : "lg:w-[272px]"
          )}
          style={{ background: "rgba(251, 252, 247, 0.58)" }}
        >
          {/* Cabeçalho: Menu + recolher (estilo Dynamics) */}
          <div
            className={cn(
              "flex items-center gap-2 border-b border-slate-200/60 px-3 py-3 lg:px-4",
              sidebarCollapsed && isDesktop ? "lg:justify-center" : "justify-between"
            )}
          >
            <h2
              className={cn(
                "min-w-0 text-lg font-black tracking-tight text-slate-900",
                sidebarCollapsed && isDesktop && "lg:hidden"
              )}
            >
              Menu
            </h2>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(
                "shrink-0 rounded-full border-slate-200/90 bg-white text-slate-600 shadow-sm hover:bg-slate-50",
                !sidebarCollapsed || !isDesktop ? "ml-auto" : ""
              )}
              aria-expanded={!sidebarCollapsed}
              aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              onClick={toggleSidebar}
            >
              {sidebarCollapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
            </Button>
          </div>

          {/* Marca — link para o painel do paciente */}
          <Link
            to="/paciente"
            className={cn(
              "flex border-b border-slate-200/60 px-3 py-4 transition-colors hover:bg-black/[0.04] lg:px-4",
              sidebarCollapsed && isDesktop ? "lg:flex-col lg:items-center lg:gap-2" : "items-center gap-3"
            )}
            aria-label="Ir para o painel do paciente"
          >
            {settings.logoDataUrl ? (
              <img
                src={settings.logoDataUrl}
                alt=""
                className={cn(
                  "shrink-0 rounded-2xl object-cover shadow-card",
                  sidebarCollapsed && isDesktop ? "lg:size-11" : "h-11 w-11"
                )}
              />
            ) : (
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-700 text-white shadow-card",
                  sidebarCollapsed && isDesktop ? "lg:size-11" : "h-11 w-11"
                )}
              >
                <Activity className="size-5" strokeWidth={2.5} />
              </div>
            )}
            <div
              className={cn(
                "min-w-0 flex-1",
                sidebarCollapsed && isDesktop && "lg:hidden"
              )}
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-500">OncoCare</p>
              <p className="truncate font-bold leading-tight text-slate-900">{settings.hospitalName}</p>
            </div>
          </Link>

          <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-3 lg:px-3" aria-label="Principal">
            <div>
              <p
                className={cn(
                  "mb-2 px-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400",
                  sidebarCollapsed && isDesktop && "lg:hidden"
                )}
              >
                Principal
              </p>
              <div className="flex flex-col gap-1">
                {navMain.map((item) => (
                  <SidebarLink
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    end={item.end}
                    collapsed={sidebarCollapsed}
                    pathname={pathname}
                    isDesktop={isDesktop}
                  />
                ))}
              </div>
            </div>

            <div>
              <p
                className={cn(
                  "mb-2 px-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400",
                  sidebarCollapsed && isDesktop && "lg:hidden"
                )}
              >
                Sistema
              </p>
              <div className="mb-2 flex flex-col gap-1">
                <SidebarLink
                  to="/configuracoes"
                  label="Configurações"
                  icon={Building2}
                  collapsed={sidebarCollapsed}
                  pathname={pathname}
                  isDesktop={isDesktop}
                />
                <SidebarLink
                  to="/operacao-infusao"
                  label="Infusão (ops)"
                  icon={Armchair}
                  collapsed={sidebarCollapsed}
                  pathname={pathname}
                  isDesktop={isDesktop}
                />
              </div>
              {sidebarCollapsed && isDesktop ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>{accountInner}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10} className="font-medium">
                    Conta
                  </TooltipContent>
                </Tooltip>
              ) : (
                accountInner
              )}
            </div>
          </nav>

          <p
            className={cn(
              "mt-auto px-3 pb-3 text-[0.65rem] leading-relaxed text-slate-500 lg:px-4",
              sidebarCollapsed && isDesktop && "lg:hidden"
            )}
          >
            Monitorização oncológica · triagem e recursos
          </p>
        </aside>

        {/* Conteúdo */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col self-stretch bg-transparent">
          <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b border-slate-100 bg-white/60 px-3 py-3 shadow-card backdrop-blur-md sm:px-4 md:px-5 lg:px-6">
            <div className="relative min-w-[200px] flex-1 max-w-2xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar paciente, prontuário ou diagnóstico…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="h-12 rounded-full border-0 bg-surface-muted pl-12 shadow-none ring-1 ring-slate-200/80 transition-shadow focus-visible:ring-2 focus-visible:ring-teal-500/30"
                aria-label="Pesquisar paciente"
              />
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-surface-muted px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-500 opacity-40" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime-500" />
                </span>
                Sistema online
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex cursor-default items-center gap-2 rounded-2xl px-1 py-1 transition-colors hover:bg-surface-muted">
                    <Avatar className="h-11 w-11 border-2 border-slate-100 shadow-sm">
                      {staffAvatarSrc ? (
                        <AvatarImage src={staffAvatarSrc} alt="" className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-lime-100 text-lime-900">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="hidden text-left sm:block">
                      <p className="text-sm font-bold leading-tight text-slate-900">{firstName(displayName)}</p>
                      <p className="text-xs text-muted-foreground">{staffProfile?.role ?? "Equipe"}</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{displayName}</TooltipContent>
              </Tooltip>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft"
                aria-label="Sair"
                onClick={() => {
                  void signOut();
                }}
              >
                <LogOut className="size-5" />
              </Button>
            </div>
          </header>

          <AnimatePresence>
            <motion.main
              key={mainMotionKey}
              className={cn(
                "flex w-full min-h-0 flex-1 flex-col justify-start overflow-x-hidden px-3 sm:px-4 md:px-5 lg:px-6",
                pathname === "/pacientes"
                  ? "pb-6 pt-2 sm:pt-3"
                  : pathname === "/paciente" || pathname.startsWith("/paciente/")
                    ? "pb-5 pt-4 sm:pt-5"
                    : "py-5"
              )}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={routeContentTransition}
            >
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
}
