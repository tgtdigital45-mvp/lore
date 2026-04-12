import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Armchair, BedDouble, ChevronRight, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getResourcePreview, kindLabel } from "@/lib/infusionResourceUi";
import { useInfusionAgenda } from "@/hooks/useInfusionAgenda";
import { supabase } from "@/lib/supabase";

export function OncoCareAgendaPage() {
  const { hospitalId, resources, bookings, loading, error, reload, kpis } = useInfusionAgenda();

  const [busy, setBusy] = useState(false);
  const [addChairs, setAddChairs] = useState("1");
  const [addMacas, setAddMacas] = useState("0");
  const [configOpen, setConfigOpen] = useState(false);

  const now = Date.now();

  const chairCount = resources.filter((r) => r.kind === "chair").length;
  const stretcherCount = resources.filter((r) => r.kind === "stretcher").length;

  async function addResources() {
    if (!hospitalId) return;
    const nChair = Math.max(0, Math.min(30, parseInt(addChairs, 10) || 0));
    const nMaca = Math.max(0, Math.min(30, parseInt(addMacas, 10) || 0));
    if (nChair + nMaca === 0) return;
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
      }[] = [];
      for (let i = 1; i <= nChair; i++) {
        rows.push({
          hospital_id: hospitalId,
          kind: "chair",
          label: `Cadeira ${chairCount + i}`,
          sort_order: maxChair + i,
          operational_status: "active",
          details: null,
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
        });
      }
      const { error: e } = await supabase.from("infusion_resources").insert(rows);
      if (e) throw e;
      await reload();
      setAddChairs("0");
      setAddMacas("0");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 pb-16">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black tracking-tight">Agenda · recursos</h1>
        <p className="mt-2 text-muted-foreground">
          Toque num recurso para abrir a página de agendamentos, manutenção e lista de reservas.
        </p>
      </motion.div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-[28px] border-[3px] border-[#10B981]/35 bg-white p-4">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Disponíveis agora</p>
          <p className="mt-1 text-3xl font-black text-[#059669]">{kpis.available}</p>
        </Card>
        <Card className="rounded-[28px] border-[3px] border-[#FFA500]/40 bg-white p-4">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Ocupadas agora</p>
          <p className="mt-1 text-3xl font-black text-[#C2410C]">{kpis.occupied}</p>
        </Card>
        <Card className="rounded-[28px] border-[3px] border-[#94A3B8]/50 bg-white p-4">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">Manutenção</p>
          <p className="mt-1 text-3xl font-black text-slate-600">{kpis.maintenance}</p>
        </Card>
      </div>

      <Card className="rounded-[32px] border-[3px] border-[#F3F4F6] p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setConfigOpen((v) => !v)}
        >
          <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cadastro da unidade</span>
          <Badge variant="outline" className="rounded-xl">
            {chairCount} cadeiras · {stretcherCount} macas
          </Badge>
        </button>
        {configOpen ? (
          <div className="mt-4 flex flex-col gap-4 border-t border-[#F3F4F6] pt-4">
            <p className="text-sm text-muted-foreground">
              Defina quantas posições adicionar. Cada cadeira ou maca aparece na grelha; manutenção e reservas ficam na página
              do recurso.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm font-medium">
                Novas cadeiras
                <Input
                  type="number"
                  min={0}
                  max={30}
                  className="mt-1 max-w-[120px] rounded-2xl border-[3px]"
                  value={addChairs}
                  onChange={(e) => setAddChairs(e.target.value)}
                />
              </label>
              <label className="text-sm font-medium">
                Novas macas
                <Input
                  type="number"
                  min={0}
                  max={30}
                  className="mt-1 max-w-[120px] rounded-2xl border-[3px]"
                  value={addMacas}
                  onChange={(e) => setAddMacas(e.target.value)}
                />
              </label>
              <Button type="button" className="rounded-2xl" disabled={busy || !hospitalId} onClick={() => void addResources()}>
                <Plus className="mr-2 size-4" />
                Adicionar ao cadastro
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {error ? (
        <p className="rounded-2xl border-[3px] border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</p>
      ) : null}
      {loading ? <p className="text-sm text-muted-foreground">A carregar recursos…</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
          const Icon = c.kind === "chair" ? Armchair : BedDouble;
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/agenda/recurso/${c.id}`}
                className={cn(
                  "group block h-full rounded-[32px] outline-none transition",
                  "focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:ring-offset-2"
                )}
              >
                <Card
                  className={cn(
                    "h-full rounded-[32px] border-[3px] p-5 transition",
                    border,
                    "hover:shadow-lg hover:shadow-black/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                        <Icon className="size-4 shrink-0 opacity-80" />
                        {kindLabel(c.kind)}
                      </p>
                      <p className="mt-1 truncate text-lg font-black">{c.label}</p>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>

                  <div className="mt-4 rounded-2xl border-[3px] border-[#F3F4F6] bg-[#FAFBFC] px-3 py-3">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">{preview.title}</p>
                    <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{preview.subtitle}</p>
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {c.details?.trim() || "Sem notas de equipamento."}
                  </p>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
