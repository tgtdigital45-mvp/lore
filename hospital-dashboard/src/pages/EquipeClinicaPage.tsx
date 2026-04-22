import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  Image as ImageIcon,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sanitizeSupabaseError } from "@/lib/errorMessages";
import { useOncoCare } from "@/context/OncoCareContext";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { listContainerVariants, listItemVariants, modalOverlayTransition, modalPanelTransition } from "@/lib/motionPresets";
import { initialsFromName, roleLabel } from "@/lib/dashboardProfile";
import { cn } from "@/lib/utils";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";

/** Seg=1 … Dom=7 (ISO weekday) */
const WORK_DAY_KEYS = ["1", "2", "3", "4", "5", "6", "7"] as const;
type WorkDayKey = (typeof WORK_DAY_KEYS)[number];

const WORK_DAY_LABELS: Record<WorkDayKey, string> = {
  "1": "Seg",
  "2": "Ter",
  "3": "Qua",
  "4": "Qui",
  "5": "Sex",
  "6": "Sáb",
  "7": "Dom",
};

type WorkSchedule = Partial<Record<WorkDayKey, { start: string; end: string }>>;

function parseWorkSchedule(raw: unknown): WorkSchedule {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: WorkSchedule = {};
  for (const k of WORK_DAY_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const start = typeof (v as { start?: unknown }).start === "string" ? (v as { start: string }).start : "";
      const end = typeof (v as { end?: unknown }).end === "string" ? (v as { end: string }).end : "";
      if (start && end) out[k] = { start, end };
    }
  }
  return out;
}

function formatScheduleSummary(ws: WorkSchedule): string {
  const parts = WORK_DAY_KEYS.filter((k) => ws[k]).map((k) => `${WORK_DAY_LABELS[k]} ${ws[k]!.start}–${ws[k]!.end}`);
  return parts.length ? parts.join(" · ") : "—";
}

type ProfileEmbed = {
  id: string;
  full_name: string | null;
  role: string;
  specialty: string | null;
  job_title: string | null;
  professional_license: string | null;
  email_display: string | null;
  phone_e164: string | null;
  avatar_url: string | null;
};

type StaffRow = {
  id: string;
  staff_id: string;
  hospital_id: string;
  clinical_shift: string | null;
  work_schedule: unknown;
  profiles: ProfileEmbed | ProfileEmbed[] | null;
};

function normalizeProfile(p: StaffRow["profiles"]): ProfileEmbed | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

function roleBadgeClass(role: string): string {
  if (role === "doctor") return "border-amber-200 bg-amber-100 text-amber-950";
  if (role === "nurse") return "border-sky-200 bg-sky-100 text-sky-950";
  if (role === "hospital_admin") return "border-violet-200 bg-violet-100 text-violet-950";
  return "border-slate-200 bg-slate-100 text-slate-800";
}

export function EquipeClinicaPage() {
  const { staffProfile } = useOncoCare();
  const isAdmin = staffProfile?.role === "hospital_admin";
  const [loading, setLoading] = useState(true);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRow | null>(null);
  const [menuStaffId, setMenuStaffId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      const { data: sa, error: e1 } = await supabase.from("staff_assignments").select("hospital_id").eq("staff_id", uid).limit(1).maybeSingle();
      if (e1 || !sa?.hospital_id) {
        toast.error("Sem hospital associado.");
        setRows([]);
        return;
      }
      const hid = sa.hospital_id as string;
      setHospitalId(hid);
      const { data: sas, error: sasErr } = await supabase
        .from("staff_assignments")
        .select(
          "id, staff_id, hospital_id, clinical_shift, work_schedule, profiles(id, full_name, role, specialty, job_title, professional_license, email_display, phone_e164, avatar_url)"
        )
        .eq("hospital_id", hid);
      if (sasErr) {
        toast.error(sanitizeSupabaseError(sasErr));
        setRows([]);
      } else {
        setRows((sas as StaffRow[]) ?? []);
      }
    } catch (err) {
      toast.error(sanitizeSupabaseError(err as { message?: string }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!menuStaffId) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuStaffId(null);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuStaffId]);

  const counts = rows.reduce(
    (acc, r) => {
      const p = normalizeProfile(r.profiles);
      const role = p?.role ?? "";
      if (role === "doctor") acc.doctors += 1;
      if (role === "hospital_admin") acc.admins += 1;
      if (role === "nurse") acc.nurses += 1;
      return acc;
    },
    { doctors: 0, nurses: 0, admins: 0 }
  );

  return (
    <motion.div
      variants={listContainerVariants}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-6xl space-y-8 px-4 py-8"
    >
      <motion.div variants={listItemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Equipe Clínica</h1>
          <p className="text-sm text-muted-foreground">Profissionais de saúde ativos e escala de plantão.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {loading ? (
            <>
              <span className="sr-only">A carregar equipe…</span>
              <SkeletonPulse rounded="2xl" className="h-14 w-36 shrink-0" />
              <SkeletonPulse rounded="2xl" className="h-14 w-36 shrink-0" />
              {isAdmin ? <SkeletonPulse rounded="2xl" className="h-11 w-44 shrink-0 rounded-full" /> : null}
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-amber-100/80 bg-amber-50/90 px-5 py-3 shadow-sm">
                <p className="text-2xl font-black tabular-nums text-slate-900">{counts.doctors + counts.admins}</p>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Médicos / gestão</p>
              </div>
              <div className="rounded-2xl border border-sky-100/80 bg-sky-50/90 px-5 py-3 shadow-sm">
                <p className="text-2xl font-black tabular-nums text-slate-900">{counts.nurses}</p>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">Enfermeiros</p>
              </div>
              {isAdmin ? (
                <Button type="button" className="rounded-full gap-2 shadow-card" onClick={() => setAddOpen(true)}>
                  <UserPlus className="size-4" />
                  Adicionar membro
                </Button>
              ) : null}
            </>
          )}
        </div>
      </motion.div>

      <motion.div
        variants={listItemVariants}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-busy={loading}
        aria-label={loading ? "A carregar equipe" : "Lista da equipe"}
      >
        {loading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <SkeletonPulse key={i} rounded="3xl" className="min-h-[14rem] w-full shrink-0" />
            ))}
          </>
        ) : (
          rows.map((row) => {
          const pr = normalizeProfile(row.profiles);
          const name = pr?.full_name?.trim() || "Sem nome";
          const initials = initialsFromName(name);
          const menuOpen = menuStaffId === row.staff_id;
          const ws = parseWorkSchedule(row.work_schedule);
          const shiftLine = row.clinical_shift?.trim() || formatScheduleSummary(ws);
          return (
            <Card key={row.id} className="relative overflow-hidden rounded-2xl border border-slate-100/90 bg-white/95 p-5 shadow-card">
              <div className="flex gap-3">
                <div className="relative shrink-0">
                  <Avatar className="size-14 rounded-xl border border-slate-100">
                    {pr?.avatar_url ? <AvatarImage src={pr.avatar_url} alt="" className="object-cover" /> : null}
                    <AvatarFallback className="rounded-xl bg-slate-100 text-sm font-bold text-slate-700">{initials}</AvatarFallback>
                  </Avatar>
                  <span
                    className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-lime-500"
                    aria-hidden
                    title="Ativo"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn("rounded-full px-2 py-0 text-[0.65rem] font-semibold", roleBadgeClass(pr?.role ?? ""))}>
                          {roleLabel(pr?.role)}
                        </Badge>
                        {pr?.job_title ? (
                          <span className="truncate text-xs font-medium text-slate-600">{pr.job_title}</span>
                        ) : null}
                        {pr?.specialty ? <span className="truncate text-xs text-muted-foreground">{pr.specialty}</span> : null}
                      </div>
                    </div>
                    {isAdmin ? (
                      <div className="relative shrink-0" ref={menuOpen ? menuRef : undefined}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-9 rounded-full text-slate-500 hover:bg-slate-100"
                          aria-expanded={menuOpen}
                          aria-haspopup="menu"
                          aria-label="Opções"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuStaffId(menuOpen ? null : row.staff_id);
                          }}
                        >
                          <MoreVertical className="size-5" />
                        </Button>
                        {menuOpen ? (
                          <div
                            className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                            role="menu"
                          >
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                              role="menuitem"
                              onClick={() => {
                                setMenuStaffId(null);
                                setEditTarget(row);
                              }}
                            >
                              <Pencil className="size-4" />
                              Editar
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                              role="menuitem"
                              onClick={() => {
                                setMenuStaffId(null);
                                setDeleteTarget(row);
                              }}
                            >
                              <Trash2 className="size-4" />
                              Excluir lotação
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <span className="flex items-start gap-1">
                      <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
                      <span className="min-w-0 leading-snug">{shiftLine || "—"}</span>
                    </span>
                    {pr?.professional_license ? (
                      <span className="flex items-center gap-1 truncate font-medium text-slate-500">
                        <Star className="size-3.5 shrink-0" />
                        {pr.professional_license}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {pr?.email_display ? (
                  <a href={`mailto:${pr.email_display}`} className="contents">
                    <Button type="button" variant="outline" className="rounded-xl border-slate-200">
                      <Mail className="size-4" />
                      E-mail
                    </Button>
                  </a>
                ) : (
                  <Button type="button" variant="outline" className="rounded-xl border-slate-200" disabled>
                    <Mail className="size-4" />
                    E-mail
                  </Button>
                )}
                {pr?.phone_e164 ? (
                  <a href={`tel:${pr.phone_e164}`} className="contents">
                    <Button type="button" variant="outline" className="rounded-xl border-slate-200">
                      <Phone className="size-4" />
                      Ligar
                    </Button>
                  </a>
                ) : (
                  <Button type="button" variant="outline" className="rounded-xl border-slate-200" disabled>
                    <Phone className="size-4" />
                    Ligar
                  </Button>
                )}
              </div>
            </Card>
          );
          })
        )}
      </motion.div>

      {!loading && rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Nenhum membro na equipa deste hospital.</p>
      ) : null}

      <AddStaffModal
        open={addOpen}
        onOpenChange={setAddOpen}
        hospitalId={hospitalId}
        onSuccess={() => {
          setAddOpen(false);
          void load();
        }}
      />
      <EditStaffModal
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
        row={editTarget}
        onSuccess={() => {
          setEditTarget(null);
          void load();
        }}
      />
      <DeleteStaffModal
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        row={deleteTarget}
        hospitalId={hospitalId}
        onSuccess={() => {
          setDeleteTarget(null);
          void load();
        }}
      />
    </motion.div>
  );
}

function AddStaffModal({
  open,
  onOpenChange,
  hospitalId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  hospitalId: string | null;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setEmail("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hospitalId) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Indique o email do utilizador.");
      return;
    }
    setBusy(true);
    try {
      const { data: staffId, error: rpcErr } = await supabase.rpc("hospital_admin_lookup_staff_by_email", {
        p_email: trimmed,
      });
      if (rpcErr) throw rpcErr;
      if (!staffId) {
        toast.error("Email não encontrado. O utilizador tem de se registar primeiro.");
        return;
      }
      const { error: insErr } = await supabase.from("staff_assignments").insert({ staff_id: staffId as string, hospital_id: hospitalId });
      if (insErr) {
        if (insErr.code === "23505") {
          toast.error("Este utilizador já está na equipa.");
        } else {
          throw insErr;
        }
        return;
      }
      toast.success("Membro adicionado à equipa.");
      onSuccess();
    } catch (err) {
      toast.error(sanitizeSupabaseError(err as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="add-staff-overlay"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[6px] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-staff-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={modalOverlayTransition}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={modalPanelTransition}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h2 id="add-staff-title" className="text-lg font-bold text-slate-900">
                  Adicionar à equipa
                </h2>
                <p className="text-sm text-muted-foreground">Email do utilizador já registado no sistema.</p>
              </div>
              <button
                type="button"
                className="rounded-xl p-2 text-muted-foreground hover:bg-slate-50"
                aria-label="Fechar"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={(ev) => void submit(ev)} className="space-y-4">
              <div>
                <label htmlFor="add-staff-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </label>
                <Input
                  id="add-staff-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nome@hospital.pt"
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-full gap-2" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  Vincular
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function EditStaffModal({
  open,
  onOpenChange,
  row,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: StaffRow | null;
  onSuccess: () => void;
}) {
  const pr = row ? normalizeProfile(row.profiles) : null;
  const [specialty, setSpecialty] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [license, setLicense] = useState("");
  const [clinicalShift, setClinicalShift] = useState("");
  const [schedule, setSchedule] = useState<WorkSchedule>({});
  const [emailDisplay, setEmailDisplay] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setAvatarFile(null);
      setAvatarPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    }
  }, [open]);

  useEffect(() => {
    if (pr && row) {
      setSpecialty(pr.specialty ?? "");
      setJobTitle(pr.job_title ?? "");
      setLicense(pr.professional_license ?? "");
      setClinicalShift(row.clinical_shift ?? "");
      setSchedule(parseWorkSchedule(row.work_schedule));
      setEmailDisplay(pr.email_display ?? "");
      setPhone(pr.phone_e164 ?? "");
    }
  }, [pr, row]);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  function toggleDay(day: WorkDayKey) {
    setSchedule((prev) => {
      const next = { ...prev };
      if (next[day]) {
        delete next[day];
      } else {
        next[day] = { start: "08:00", end: "17:00" };
      }
      return next;
    });
  }

  function setDayTimes(day: WorkDayKey, field: "start" | "end", value: string) {
    setSchedule((prev) => {
      const cur = prev[day] ?? { start: "08:00", end: "17:00" };
      return { ...prev, [day]: { ...cur, [field]: value } };
    });
  }

  function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2 MB.");
      return;
    }
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pr?.id || !row?.id) return;
    setBusy(true);
    try {
      const wsClean: WorkSchedule = {};
      for (const k of WORK_DAY_KEYS) {
        const slot = schedule[k];
        if (slot?.start?.trim() && slot?.end?.trim()) {
          wsClean[k] = { start: slot.start.trim(), end: slot.end.trim() };
        }
      }

      let nextAvatarUrl = pr.avatar_url;
      if (avatarFile) {
        const safe = avatarFile.name.replace(/\s+/g, "_");
        const path = `${pr.id}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, avatarFile, {
          upsert: true,
          contentType: avatarFile.type || "image/jpeg",
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
        nextAvatarUrl = pub.publicUrl;
      }

      // Equipe Clínica NUNCA altera full_name (dado de conta; gerido na aba Conta).
      const profilePatch: Record<string, string | null> = {
        specialty: specialty.trim() || null,
        professional_license: license.trim() || null,
        email_display: emailDisplay.trim() || null,
        phone_e164: phone.trim() || null,
        avatar_url: nextAvatarUrl,
      };

      // job_title só incluído se a coluna existir (migração 20002).
      const profilePatchWithJobTitle: Record<string, string | null> = {
        ...profilePatch,
        job_title: jobTitle.trim() || null,
      };

      let profErr = (await supabase.from("profiles").update(profilePatchWithJobTitle).eq("id", pr.id)).error;
      if (profErr) {
        const blob = [profErr.code, profErr.message, (profErr as { details?: string }).details].filter(Boolean).join(" ").toLowerCase();
        const missingCol =
          profErr.code === "42703" ||
          (blob.includes("job_title") && (blob.includes("does not exist") || blob.includes("unknown")));
        if (missingCol) {
          profErr = (await supabase.from("profiles").update(profilePatch).eq("id", pr.id)).error;
        }
      }
      if (profErr) throw profErr;

      const { error: saErr } = await supabase
        .from("staff_assignments")
        .update({
          clinical_shift: clinicalShift.trim() || null,
          work_schedule: wsClean,
        })
        .eq("id", row.id);
      if (saErr) throw saErr;

      toast.success("Profissional atualizado.");
      onSuccess();
    } catch (err) {
      toast.error(sanitizeSupabaseError(err as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && row && pr ? (
        <motion.div
          key="edit-staff-overlay"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[6px] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-staff-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={modalOverlayTransition}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={modalPanelTransition}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="shrink-0 border-b border-slate-100 px-6 pb-4 pt-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 id="edit-staff-title" className="text-lg font-bold text-slate-900">
                    {pr.full_name?.trim() || "Profissional"}
                  </h2>
                  <p className="text-sm text-muted-foreground">{roleLabel(pr.role)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">O nome é gerido na aba Conta.</p>
                </div>
                <button
                  type="button"
                  className="rounded-xl p-2 text-muted-foreground hover:bg-slate-50"
                  aria-label="Fechar"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <form onSubmit={(ev) => void submit(ev)} className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4 pb-24">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Especialidade</label>
                  <Input
                    value={specialty}
                    onChange={(ev) => setSpecialty(ev.target.value)}
                    className="h-11 rounded-xl bg-slate-50/80"
                    placeholder="Oncologia médica, enfermagem…"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Cargo</label>
                  <Input
                    value={jobTitle}
                    onChange={(ev) => setJobTitle(ev.target.value)}
                    className="h-11 rounded-xl bg-slate-50/80"
                    placeholder="Coordenador, interno, etc."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Registo profissional</label>
                  <Input
                    value={license}
                    onChange={(ev) => setLicense(ev.target.value)}
                    className="h-11 rounded-xl bg-slate-50/80"
                    placeholder="CRM, COREN…"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Plantão</label>
                  <Input
                    value={clinicalShift}
                    onChange={(ev) => setClinicalShift(ev.target.value)}
                    className="h-11 rounded-xl bg-slate-50/80"
                    placeholder="Ex.: Ambulatório, Urgências"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Dias da semana e horários</p>
                  <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="flex flex-wrap gap-3">
                      {WORK_DAY_KEYS.map((day) => (
                        <label key={day} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={!!schedule[day]}
                            onChange={() => toggleDay(day)}
                            className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                          />
                          {WORK_DAY_LABELS[day]}
                        </label>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {WORK_DAY_KEYS.filter((d) => schedule[d]).map((day) => (
                        <div key={`${day}-times`} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="w-10 font-semibold text-slate-600">{WORK_DAY_LABELS[day]}</span>
                          <Input
                            type="time"
                            value={schedule[day]?.start ?? "08:00"}
                            onChange={(ev) => setDayTimes(day, "start", ev.target.value)}
                            className="h-9 w-36 rounded-xl bg-white"
                          />
                          <span className="text-muted-foreground">até</span>
                          <Input
                            type="time"
                            value={schedule[day]?.end ?? "17:00"}
                            onChange={(ev) => setDayTimes(day, "end", ev.target.value)}
                            className="h-9 w-36 rounded-xl bg-white"
                          />
                        </div>
                      ))}
                    </div>
                    {!WORK_DAY_KEYS.some((d) => schedule[d]) ? (
                      <p className="text-xs text-muted-foreground">Marque os dias em que o profissional está disponível neste hospital.</p>
                    ) : null}
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">E-mail de contacto</label>
                  <Input
                    type="email"
                    value={emailDisplay}
                    onChange={(ev) => setEmailDisplay(ev.target.value)}
                    className="h-11 rounded-xl bg-slate-50/80"
                    placeholder="contacto@hospital.pt"
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Telefone</label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(ev) => setPhone(ev.target.value)}
                    className="h-11 rounded-xl bg-slate-50/80"
                    placeholder="+351 … ou E.164"
                    autoComplete="tel"
                  />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Foto</p>
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    <Avatar className="size-16 rounded-xl border border-slate-200">
                      {(avatarPreview || pr.avatar_url) && (
                        <AvatarImage src={avatarPreview ?? pr.avatar_url ?? ""} alt="" className="object-cover" />
                      )}
                      <AvatarFallback className="rounded-xl bg-white text-sm font-bold">
                        {initialsFromName(pr.full_name || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                        <ImageIcon className="size-4" />
                        Escolher imagem
                        <input type="file" accept="image/*" className="sr-only" onChange={onAvatarPick} />
                      </label>
                      <p className="mt-1 text-[0.65rem] text-muted-foreground">Máx. 2 MB. A foto fica visível na equipa.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white py-4">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="rounded-full" disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}
                </Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DeleteStaffModal({
  open,
  onOpenChange,
  row,
  hospitalId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: StaffRow | null;
  hospitalId: string | null;
  onSuccess: () => void;
}) {
  const pr = row ? normalizeProfile(row.profiles) : null;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onOpenChange]);

  async function confirmDelete() {
    if (!row || !hospitalId) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("staff_assignments").delete().eq("staff_id", row.staff_id).eq("hospital_id", hospitalId);
      if (error) throw error;
      toast.success("Lotação removida.");
      onSuccess();
    } catch (err) {
      toast.error(sanitizeSupabaseError(err as { message?: string }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && row && pr ? (
        <motion.div
          key="del-staff-overlay"
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[6px] sm:items-center"
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={modalOverlayTransition}
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={modalPanelTransition}
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-900">Remover da equipa?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-semibold text-slate-800">{pr.full_name ?? pr.id}</span> deixará de ter acesso a este hospital. O utilizador não é apagado.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" className="rounded-full" disabled={busy} onClick={() => void confirmDelete()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Remover"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default EquipeClinicaPage;
