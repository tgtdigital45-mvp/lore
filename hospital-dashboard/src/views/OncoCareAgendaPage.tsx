"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronRight, Clock, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AgendaDailyListCard } from "@/components/oncocare/AgendaDailyListCard";
import { ResourceVisualIcons } from "@/components/oncocare/ResourceVisualIcons";
import { getResourcePreview, kindLabel, type ResourcePreview } from "@/lib/infusionResourceUi";
import { useInfusionAgenda, type InfusionResourceRow } from "@/hooks/useInfusionAgenda";
import { supabase } from "@/lib/supabase";
import {
  listContainerVariants,
  listItemVariants,
  modalOverlayTransition,
  modalPanelTransition,
} from "@/lib/motionPresets";
import { SkeletonPulse } from "@/components/ui/SkeletonPulse";
import { toast } from "sonner";
import { sanitizeSupabaseError } from "@/lib/errorMessages";

const DAY_NAMES = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function formatTodayLong() {
  const d = new Date();
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]} de ${d.getFullYear()}`;
}

function toneStyles(tone: ResourcePreview["tone"]): { bar: string; dot: string } {
  switch (tone) {
    case "maintenance":
      return { bar: "border-l-slate-400", dot: "bg-slate-400" };
    case "in_session":
      return { bar: "border-l-amber-500", dot: "bg-amber-500" };
    case "next_up":
      return { bar: "border-l-indigo-500", dot: "bg-indigo-500" };
    case "free":
      return { bar: "border-l-emerald-500", dot: "bg-emerald-500" };
    default:
      return { bar: "border-l-slate-300", dot: "bg-slate-300" };
  }
}

export function OncoCareAgendaPage() {
  const { hospitalId, resources, bookings, loading, error, reload, kpis } = useInfusionAgenda();

  const [busy, setBusy] = useState(false);
  const [addChairs, setAddChairs] = useState("1");
  const [addMacas, setAddMacas] = useState("0");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const now = Date.now();
  const todayLong = formatTodayLong();

  const chairCount = resources.filter((r) => r.kind === "chair").length;
  const stretcherCount = resources.filter((r) => r.kind === "stretcher").length;
  const totalResources = resources.length;
  const occupancyPct = totalResources > 0 ? Math.round((kpis.occupied / totalResources) * 100) : 0;

  async function addResources(): Promise<boolean> {
    if (!hospitalId) return false;
    const nChair = Math.max(0, Math.min(30, parseInt(addChairs, 10) || 0));
    const nMaca = Math.max(0, Math.min(30, parseInt(addMacas, 10) || 0));
    if (nChair + nMaca === 0) return false;
    setBusy(true);
    try {
      const maxChair = Math.max(0, ...resources.filter((r) => r.kind === "chair").map((r) => r.sort_order));
      const maxMaca = Math.max(0, ...resources.filter((r) => r.kind === "stretcher").map((r) => r.sort_order));
      const rows: {
        hospital_id: string;
        kind: "chair" | "stretcher";
        label: string;
        sort_order: number;
        operational_status: "active";
        details: string | null;
        paxman_cryotherapy: boolean;
      }[] = [];
      for (let i = 1; i <= nChair; i++) {
        rows.push({
          hospital_id: hospitalId,
          kind: "chair",
          label: `Cadeira ${chairCount + i}`,
          sort_order: maxChair + i,
          operational_status: "active",
          details: null,
          paxman_cryotherapy: false,
        });
      }
      for (let i = 1; i <= nMaca; i++) {
        rows.push({
          hospital_id: hospitalId,
          kind: "stretcher",
          label: `Maca ${stretcherCount + i}`,
          sort_order: Math.max(100, maxMaca) + i,
          operational_status: "active",
          details: null,
          paxman_cryotherapy: false,
        });
      }
      const { error: e } = await supabase.from("infusion_resources").insert(rows);
      if (e) throw e;
      await reload();
      setAddChairs("1");
      setAddMacas("0");
      return true;
    } catch (err) {
      toast.error(sanitizeSupabaseError(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!addModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addModalOpen]);

  function startEdit(c: InfusionResourceRow) {
    setEditingId(c.id);
    setEditLabel(c.label);
  }

  async function saveLabel(id: string) {
    const trimmed = editLabel.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const { error: e } = await supabase.from("infusion_resources").update({ label: trimmed }).eq("id", id);
      if (e) throw e;
      setEditingId(null);
      await reload();
    } catch (err) {
      toast.error(sanitizeSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteResource(c: InfusionResourceRow) {
    const n = bookings.filter((b) => b.resource_id === c.id).length;
    const msg =
      n > 0
        ? `Excluir "${c.label}"? Esta ação remove também ${n} reserva(s) agendada(s) neste recurso.`
        : `Excluir "${c.label}"?`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      const { error: e } = await supabase.from("infusion_resources").delete().eq("id", c.id);
      if (e) throw e;
      if (editingId === c.id) setEditingId(null);
      await reload();
    } catch (err) {
      toast.error(sanitizeSupabaseError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-7xl flex-col gap-8 pb-12 sm:pb-16">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-6 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-teal-700">
              <Calendar className="size-4 shrink-0" />
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider">Agenda · infusão</p>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Unidade de Infusão</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Estado em tempo real. Abra cada posição para reservas e detalhes. Crioterapia PAXMAN na página do recurso.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:items-end">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="size-3.5" />
              <span className="text-[0.6rem] font-semibold uppercase tracking-wider">Hoje</span>
            </div>
            <p className="text-sm font-semibold capitalize text-slate-800">{todayLong}</p>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 shadow-card">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-emerald-800/80">Disponíveis</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-emerald-700">{kpis.available}</p>
            <p className="mt-0.5 text-[0.65rem] font-medium text-muted-foreground">livres agora</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 shadow-card">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-amber-900/80">Ocupadas</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-amber-800">{kpis.occupied}</p>
            <p className="mt-0.5 text-[0.65rem] font-medium text-muted-foreground">em sessão</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-card">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-slate-600">Manutenção</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-slate-800">{kpis.maintenance}</p>
            <p className="mt-0.5 text-[0.65rem] font-medium text-muted-foreground">indisponíveis</p>
          </div>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 px-4 py-3 shadow-card">
            <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-indigo-900/80">Total</p>
            <p className="mt-1 text-3xl font-black tabular-nums text-indigo-800">{totalResources}</p>
            <p className="mt-0.5 text-[0.65rem] font-medium text-muted-foreground">
              {chairCount} cadeiras · {stretcherCount} macas
            </p>
          </div>
        </div>

        {/* Occupancy */}
        {totalResources > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Ocupação atual</span>
              <span>{occupancyPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className={cn(
                  "h-full rounded-full",
                  occupancyPct >= 90 ? "bg-rose-500" : occupancyPct >= 60 ? "bg-amber-400" : "bg-emerald-500"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${occupancyPct}%` }}
                transition={{ duration: 0.75, ease: "easeOut" }}
              />
            </div>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            type="button"
            size="lg"
            className="h-12 min-w-[min(100%,260px)] flex-1 rounded-xl bg-slate-900 font-semibold text-white hover:bg-slate-800 sm:max-w-sm"
            disabled={!hospitalId}
            onClick={() => {
              setAddChairs("1");
              setAddMacas("0");
              setAddModalOpen(true);
            }}
          >
            <Plus className="mr-2 size-5 shrink-0" strokeWidth={2.5} />
            Adicionar posições
          </Button>
          <Button
            type="button"
            size="lg"
            variant={editMode ? "default" : "outline"}
            className={cn("h-12 shrink-0 rounded-xl px-6 font-semibold", editMode ? "bg-slate-900 hover:bg-slate-800" : "border-slate-200 bg-white")}
            onClick={() => {
              setEditMode((v) => {
                if (v) setEditingId(null);
                return !v;
              });
            }}
          >
            {editMode ? "Concluir edição" : "Editar posições"}
          </Button>
          <Badge variant="outline" className="h-10 w-fit shrink-0 rounded-xl border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold">
            {chairCount} cadeiras · {stretcherCount} macas
          </Badge>
        </div>
      </motion.div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-10">
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Posições da unidade</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {editMode ? (
                <span className="font-medium text-slate-700">Renomeie ou exclua com os ícones em cada cartão.</span>
              ) : (
                <>
                  Ative <span className="font-medium text-slate-800">Editar posições</span> para gestão nos cartões.
                </>
              )}
            </p>
          </div>

          {loading ? (
            <div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-busy
              aria-label="Carregando posições"
            >
              <span className="sr-only">Carregando posições…</span>
              {[...Array(6)].map((_, i) => (
                <SkeletonPulse key={i} rounded="2xl" className="h-44 min-h-[11rem] w-full" />
              ))}
            </div>
          ) : !error && resources.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/25 px-6 py-12 text-center"
              role="status"
            >
              <p className="text-lg font-bold text-foreground">Nenhuma posição configurada</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Adicione cadeiras ou macas para esta unidade. Depois poderá editar nomes, estado e detalhes em cada cartão.
              </p>
              <Button
                type="button"
                className="mt-6 rounded-xl"
                disabled={!hospitalId}
                onClick={() => {
                  setAddChairs("1");
                  setAddMacas("0");
                  setAddModalOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" aria-hidden />
                Adicionar posições
              </Button>
            </div>
          ) : (
            <motion.div
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              aria-label="Posições da unidade"
            >
              {resources.map((c) => {
                const preview = getResourcePreview(c, bookings, now);
                const { bar, dot } = toneStyles(preview.tone);
                const editing = editingId === c.id;
                return (
                  <motion.div key={c.id} variants={listItemVariants} className="min-h-0">
                  <div
                    className={cn(
                      "group flex h-full min-h-[11rem] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-card transition hover:border-slate-200 hover:shadow-md",
                      "border-l-4",
                      bar
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      {editing ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <ResourceVisualIcons kind={c.kind} cryo={c.paxman_cryotherapy} />
                            <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">{kindLabel(c.kind)}</span>
                          </div>
                          <Input
                            className="rounded-xl border-slate-200"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            disabled={busy}
                            aria-label="Nome do recurso"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" className="rounded-lg" disabled={busy || !editLabel.trim()} onClick={() => void saveLabel(c.id)}>
                              Salvar
                            </Button>
                            <Button type="button" size="sm" variant="outline" className="rounded-lg" disabled={busy} onClick={() => setEditingId(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-2">
                              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot)} title={preview.title} aria-hidden />
                              <div className="min-w-0">
                                <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">{kindLabel(c.kind)}</p>
                                <Link
                                  href={`/agenda/recurso/${c.id}`}
                                  className="group/link mt-1 block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <span className="truncate text-lg font-black tracking-tight text-slate-900">{c.label}</span>
                                    <ChevronRight className="mt-0.5 size-5 shrink-0 text-slate-300 transition group-hover/link:translate-x-0.5 group-hover/link:text-slate-600" />
                                  </div>
                                  <div className="mt-3 rounded-xl border border-slate-100 bg-surface-muted/80 px-3 py-2.5">
                                    <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-muted-foreground">{preview.title}</p>
                                    <p className="mt-0.5 text-sm font-medium leading-snug text-slate-800">{preview.subtitle}</p>
                                  </div>
                                </Link>
                              </div>
                            </div>
                          </div>
                          {c.paxman_cryotherapy ? (
                            <Badge variant="outline" className="mt-2 w-fit rounded-lg border-teal-200 bg-teal-50 text-[0.65rem] font-semibold text-teal-800">
                              PAXMAN
                            </Badge>
                          ) : null}
                          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.details?.trim() || "Sem notas de equipamento."}</p>
                        </>
                      )}
                    </div>
                    {editMode ? (
                      <div className="flex shrink-0 flex-col gap-1 border-l border-slate-100 bg-slate-50/80 p-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="size-9 shrink-0 rounded-lg border border-slate-200 bg-white shadow-sm"
                          disabled={busy || editing}
                          onClick={() => startEdit(c)}
                          aria-label="Editar nome"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="size-9 shrink-0 rounded-lg border border-rose-200 bg-white text-rose-700 shadow-sm hover:bg-rose-50"
                          disabled={busy}
                          onClick={() => void deleteResource(c)}
                          aria-label="Excluir recurso"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        <aside className="w-full shrink-0 xl:sticky xl:top-24 xl:w-[min(100%,380px)] xl:max-w-[380px]">
          <AgendaDailyListCard bookings={bookings} resources={resources} />
        </aside>
      </div>

      <AnimatePresence>
        {addModalOpen ? (
          <motion.div
            key="agenda-add-overlay"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={modalOverlayTransition}
            onClick={() => setAddModalOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="agenda-add-modal-title"
              className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={modalPanelTransition}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-3 top-3 rounded-lg p-2 text-muted-foreground hover:bg-slate-100 hover:text-foreground"
                aria-label="Fechar"
                onClick={() => setAddModalOpen(false)}
              >
                <X className="size-5" />
              </button>
              <h2 id="agenda-add-modal-title" className="pr-10 text-lg font-bold tracking-tight text-slate-900">
                Novas posições
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">Quantas cadeiras e macas deseja cadastrar?</p>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
                <label htmlFor="agenda-add-chairs" className="flex-1 text-sm font-medium">
                  Cadeiras
                  <Input
                    id="agenda-add-chairs"
                    type="number"
                    min={0}
                    max={30}
                    className="mt-1.5 rounded-xl border-slate-200"
                    value={addChairs}
                    onChange={(e) => setAddChairs(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <label htmlFor="agenda-add-macas" className="flex-1 text-sm font-medium">
                  Macas
                  <Input
                    id="agenda-add-macas"
                    type="number"
                    min={0}
                    max={30}
                    className="mt-1.5 rounded-xl border-slate-200"
                    value={addMacas}
                    onChange={(e) => setAddMacas(e.target.value)}
                    disabled={busy}
                  />
                </label>
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="outline" className="rounded-xl" disabled={busy} onClick={() => setAddModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="rounded-xl"
                  disabled={busy || !hospitalId}
                  onClick={() =>
                    void (async () => {
                      const ok = await addResources();
                      if (ok) setAddModalOpen(false);
                    })()
                  }
                >
                  <Plus className="mr-2 size-4" />
                  Adicionar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
