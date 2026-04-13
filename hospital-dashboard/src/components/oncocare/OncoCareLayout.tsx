import { useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Activity, CalendarDays, LayoutDashboard, LogOut, Search, Settings, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useOncoCare } from "@/context/OncoCareContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { firstName, initialsFromName } from "@/lib/dashboardProfile";
import { supabase } from "@/lib/supabase";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/pacientes", label: "Pacientes", icon: Users, end: false },
  { to: "/agenda", label: "Agenda", icon: CalendarDays, end: false },
];

export function OncoCareLayout() {
  const { staffProfile, staffAvatarBust, reloadStaffProfile, patientSearch, setPatientSearch } = useOncoCare();
  const navigate = useNavigate();
  const location = useLocation();

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen bg-[#F7F8FA]">
        <aside className="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r-[3px] border-[#F3F4F6] bg-white px-4 py-6">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A1A1A] text-white shadow-sm">
              <Activity className="size-6" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">OncoCare</p>
              <p className="font-bold leading-tight">Hospital</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1" aria-label="Principal">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => {
                  const agendaBranch = to === "/agenda" && location.pathname.startsWith("/agenda");
                  const active = isActive || agendaBranch;
                  return `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active ? "bg-[#1A1A1A] text-white" : "text-foreground hover:bg-muted"
                  }`;
                }}
              >
                <Icon className="size-5 shrink-0 opacity-90" />
                {label}
              </NavLink>
            ))}
            <NavLink
              to="/conta"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive ? "bg-[#1A1A1A] text-white" : "text-foreground hover:bg-muted"
                }`
              }
            >
              <Settings className="size-5 shrink-0 opacity-90" />
              Conta
            </NavLink>
          </nav>
          <p className="px-2 text-[0.65rem] leading-relaxed text-muted-foreground">
            Monitorização oncológica · triagem e recursos
          </p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-b-[3px] border-[#F3F4F6] bg-white/95 px-4 py-4 backdrop-blur-md md:px-8">
            <div className="relative min-w-[200px] max-w-xl flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente, prontuário ou diagnóstico…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="h-12 rounded-2xl border-[3px] border-[#F3F4F6] pl-11"
                aria-label="Pesquisar paciente"
              />
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl border-[3px] border-[#F3F4F6] bg-white px-3 py-2 text-sm font-medium">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#10B981] opacity-40" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                </span>
                Sistema online
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-11 w-11 border-[3px] border-[#E0E7FF]">
                      {staffAvatarSrc ? (
                        <AvatarImage src={staffAvatarSrc} alt="" className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-indigo-100 text-indigo-800">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="hidden text-left sm:block">
                      <p className="text-sm font-bold leading-tight">{firstName(displayName)}</p>
                      <p className="text-xs text-muted-foreground">{staffProfile?.role ?? "Staff"}</p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{displayName}</TooltipContent>
              </Tooltip>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-2xl border-[3px]"
                aria-label="Sair"
                onClick={() => {
                  void signOut();
                  navigate("/", { replace: true });
                }}
              >
                <LogOut className="size-5" />
              </Button>
            </div>
          </header>

          <motion.main
            className="flex-1 overflow-x-hidden px-4 py-6 md:px-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <Outlet />
          </motion.main>
        </div>
      </div>
    </TooltipProvider>
  );
}
