import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AgendaDailyListCard } from "@/components/oncocare/AgendaDailyListCard";
import { ResourceVisualIcons } from "@/components/oncocare/ResourceVisualIcons";
import { getResourcePreview, kindLabel } from "@/lib/infusionResourceUi";
import { useInfusionAgenda, type InfusionResourceRow } from "@/hooks/useInfusionAgenda";
import { supabase } from "@/lib/supabase";

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

  const chairCount = resources.filter((r) => r.kind === "chair").length;
  const stretcherCount = resources.filter((r) => r.kind === "stretcher").length;

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
      console.error(err);
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
      console.error(err);
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
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl flex-col gap-10 pb-16">
      <motion.div
        className="relative overflow-hidden rounded-[36px] border-[3px] border-[#E8ECEF] bg-gradient-to-br from-white via-[#FAFBFC] to-[#F0F9FF] px-6 py-8 shadow-sm sm:px-10"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[#38BDF8]/10 blur-3xl" aria-hidden />
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Agenda · recursos</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Visão geral da unidade. Toque num cartão para reservas e detalhes. A crioterapia (touca PAXMAN) marca-se na página de
          cada recurso — aqui só aparece o ícone quando estiver ativa.
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-[28px] border-[3px] border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/50 p-5 shadow-sm">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-700/80">Disponíveis agora</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-emerald-700">{kpis.available}</p>
        </Card>
        <Card className="rounded-[28px] border-[3px] border-amber-200/90 bg-gradient-to-br from-white to-amber-50/40 p-5 shadow-sm">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-800/75">Ocupadas agora</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-amber-800">{kpis.occupied}</p>
        </Card>
        <Card className="rounded-[28px] border-[3px] border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-5 shadow-sm">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-600">Manutenção</p>
          <p className="mt-2 text-4xl font-black tabular-nums text-slate-700">{kpis.maintenance}</p>
        </Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Button
          type="button"
          size="lg"
          className="h-14 min-w-[min(100%,280px)] flex-1 rounded-2xl border-[3px] border-[#1A1A1A] bg-[#1A1A1A] text-base font-bold shadow-md hover:bg-[#2a2a2a] sm:max-w-md"
          disabled={!hospitalId}
          onClick={() => {
            setAddChairs("1");
            setAddMacas("0");
            setAddModalOpen(true);
          }}
        >
          <Plus className="mr-2 size-5 shrink-0" strokeWidth={2.5} />
          Adicionar cadeiras ou macas
        </Button>
        <Badge
          variant="outline"
          className="h-11 w-fit shrink-0 items-center rounded-2xl border-[#818CF8]/50 bg-white px-4 py-2 text-[0.7rem] font-bold shadow-sm"
        >
          {chairCount} cadeiras · {stretcherCount} macas
        </Badge>
        <Button
          type="button"
          size="lg"
          variant={editMode ? "default" : "outline"}
          className={cn(
            "h-14 shrink-0 rounded-2xl border-[3px] px-6 font-bold",
            editMode ? "border-[#1A1A1A]" : "border-[#E2E8F0] bg-white"
          )}
          onClick={() => {
            setEditMode((v) => {
              if (v) setEditingId(null);
              return !v;
            });
          }}
        >
          {editMode ? "Concluir edição" : "Editar posições"}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Use o botão escuro para incluir posições (abre uma janela). Use <span className="font-medium text-foreground">Editar posições</span>{" "}
        para renomear ou excluir recursos nos cartões.
      </p>

      {addModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => setAddModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="agenda-add-modal-title"
            className="relative w-full max-w-md rounded-[28px] border-[3px] border-[#E8ECF1] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Fechar"
              onClick={() => setAddModalOpen(false)}
            >
              <X className="size-5" />
            </button>
            <h2 id="agenda-add-modal-title" className="pr-10 text-lg font-black tracking-tight">
              Novas posições na unidade
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Quantas cadeiras e quantas macas deseja cadastrar de uma vez?
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm font-medium">
                Novas cadeiras
                <Input
                  type="number"
                  min={0}
                  max={30}
                  className="mt-1.5 rounded-2xl border-[3px] border-[#E8ECF1]"
                  value={addChairs}
                  onChange={(e) => setAddChairs(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="flex-1 text-sm font-medium">
                Novas macas
                <Input
                  type="number"
                  min={0}
                  max={30}
                  className="mt-1.5 rounded-2xl border-[3px] border-[#E8ECF1]"
                  value={addMacas}
                  onChange={(e) => setAddMacas(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[#F1F5F9] pt-4">
              <Button type="button" variant="outline" className="rounded-2xl" disabled={busy} onClick={() => setAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="rounded-2xl"
                disabled={busy || !hospitalId}
                onClick={() =>
                  void (async () => {
                    const ok = await addResources();
                    if (ok) setAddModalOpen(false);
                  })()
                }
              >
                <Plus className="mr-2 size-4" />
                Adicionar ao cadastro
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl border-[3px] border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</p>
      ) : null}
      {loading ? <p className="text-sm text-muted-foreground">Carregando recursos…</p> : null}

      <div className="flex flex-col gap-10 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1 space-y-5">
          <div>
            <h2 className="text-lg font-black tracking-tight">Posições da unidade</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estado em tempo real. Ative <span className="font-medium text-foreground">Editar posições</span> para ver lápis e lixeira
              nos cartões.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((c, i) => {
              const preview = getResourcePreview(c, bookings, now);
              const border =
                preview.tone === "in_session"
                  ? "border-[#FFA500]/55"
                  : preview.tone === "maintenance"
                    ? "border-[#94A3B8]/60"
                    : preview.tone === "next_up"
                      ? "border-[#4F46E5]/40"
                      : "border-[#10B981]/45";
              const editing = editingId === c.id;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card
                    className={cn(
                      "h-full rounded-[32px] border-[3px] bg-white/95 p-5 shadow-sm transition",
                      border,
                      "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.06]"
                    )}
                  >
                    <div className="flex gap-2">
                      <div className="min-w-0 flex-1 space-y-3">
                        {editing ? (
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <ResourceVisualIcons kind={c.kind} cryo={c.paxman_cryotherapy} />
                              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                                {kindLabel(c.kind)}
                              </span>
                            </div>
                            <Input
                              className="mt-3 rounded-2xl border-[3px] border-[#E8ECF1]"
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              disabled={busy}
                              aria-label="Nome do recurso"
                            />
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-xl"
                                disabled={busy || !editLabel.trim()}
                                onClick={() => void saveLabel(c.id)}
                              >
                                Salvar nome
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                disabled={busy}
                                onClick={() => setEditingId(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Link
                            to={`/agenda/recurso/${c.id}`}
                            className={cn(
                              "group block rounded-2xl outline-none transition",
                              "focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2"
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <ResourceVisualIcons kind={c.kind} cryo={c.paxman_cryotherapy} />
                                  <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                                    {kindLabel(c.kind)}
                                  </span>
                                </div>
                                <p className="mt-2 truncate text-xl font-black tracking-tight">{c.label}</p>
                              </div>
                              <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                            </div>

                            <div className="mt-4 rounded-2xl border-[3px] border-[#EEF1F5] bg-gradient-to-br from-[#FAFBFC] to-[#F4F7FA] px-3.5 py-3">
                              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">{preview.title}</p>
                              <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{preview.subtitle}</p>
                            </div>
                          </Link>
                        )}

                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {c.details?.trim() || "Sem notas de equipemento."}
                        </p>
                      </div>

                      {editMode ? (
                        <div
                          className="flex shrink-0 flex-col gap-1 rounded-2xl border-2 border-[#E2E8F0] bg-[#F8FAFC] p-1 shadow-inner"
                          title="Ações do recurso"
                        >
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="size-10 shrink-0 rounded-xl border border-[#E2E8F0] bg-white shadow-sm hover:bg-[#F1F5F9]"
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
                            className="size-10 shrink-0 rounded-xl border border-[#FECACA] bg-white text-[#B91C1C] shadow-sm hover:bg-[#FEF2F2]"
                            disabled={busy}
                            onClick={() => void deleteResource(c)}
                            aria-label="Excluir recurso"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        <aside className="w-full shrink-0 xl:w-[min(100%,380px)] xl:max-w-[380px]">
          <AgendaDailyListCard bookings={bookings} resources={resources} />
        </aside>
      </div>
    </div>
  );
}
