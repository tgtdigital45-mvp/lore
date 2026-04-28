"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import { useOncoCare } from "@/context/OncoCareContext";
import { clinicalTier, TIER_ACCENT } from "@/lib/clinicalTier";
import { profileName } from "@/lib/dashboardProfile";
import { formatPatientCodeDisplay } from "@/lib/patientCode";
import { patientWhatsappContact } from "@/lib/patientWhatsApp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { listContainerVariants, listItemVariants } from "@/lib/motionPresets";

export function MensagensWorkspacePage() {
  const { rows } = useOncoCare();
  const [q, setQ] = useState("");
  const [onlyReady, setOnlyReady] = useState(false);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (onlyReady && !patientWhatsappContact(row).canMessage) return false;
      if (!t) return true;
      const name = profileName(row.profiles).toLowerCase();
      const code = (row.patient_code ?? "").toLowerCase();
      return name.includes(t) || code.includes(t);
    });
  }, [rows, q, onlyReady]);

  return (
    <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-3xl flex-col gap-6 p-4 pb-12">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">Mensagens</h1>
        <p className="mt-1 text-sm text-slate-600">
          Envio e receção via WhatsApp (Meta Cloud API ou Evolution API, conforme o{" "}
          <span className="font-semibold">onco-backend</span>). Requer telefone E.164 e opt-in no perfil do paciente.
        </p>
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          Na Evolution Manager (Webhooks), aponte o URL público do{" "}
          <span className="font-semibold">onco-backend</span>:{" "}
          <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[0.65rem]">
            POST …/api/evolution/webhook?secret=SEU_SEGREDO
          </code>{" "}
          — o mesmo valor em <code className="font-mono">EVOLUTION_WEBHOOK_SECRET</code>. Se Meta e Evolution estiverem
          ativos no servidor, use <code className="font-mono">MESSAGING_PROVIDER=evolution</code>.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="h-11 rounded-2xl border-slate-200 pl-10"
            placeholder="Pesquisar por nome ou código…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Pesquisar pacientes"
          />
        </div>
        <Button
          type="button"
          variant={onlyReady ? "default" : "outline"}
          className="h-11 shrink-0 rounded-2xl"
          onClick={() => setOnlyReady((v) => !v)}
        >
          Só com WhatsApp pronto
        </Button>
      </div>

      <motion.ul
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
        className="flex list-none flex-col gap-3 p-0"
      >
        {filtered.map((row) => {
          const tier = clinicalTier(row);
          const accent = TIER_ACCENT[tier];
          const name = profileName(row.profiles);
          const code = formatPatientCodeDisplay(row.patient_code) ?? `PR-${row.id.slice(0, 8).toUpperCase()}`;
          const { canMessage, optIn } = patientWhatsappContact(row);
          const dossier = `/inicio/${row.id}`;
          const chatUrl = `${dossier}?tab=mensagens`;

          return (
            <motion.li key={row.id} variants={listItemVariants} className="min-w-0">
              <Card className="overflow-hidden rounded-2xl border-slate-100 shadow-sm">
                <div className="h-1 w-full shrink-0" style={{ background: accent }} aria-hidden />
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{name}</span>
                      <span className="font-mono text-xs text-slate-500">{code}</span>
                      {row.hasClinicalAlert || row.hasAlert24h ? (
                        <Badge variant="destructive" className="rounded-full text-[0.6rem]">
                          Alerta
                        </Badge>
                      ) : null}
                      {!optIn ? (
                        <Badge variant="secondary" className="rounded-full text-[0.6rem]">
                          Sem opt-in
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {canMessage ? "Pronto para mensagens institucionais." : "Complete opt-in e telefone no perfil do paciente (app Aura)."}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" className="rounded-2xl">
                      <Link href={dossier}>Dossiê</Link>
                    </Button>
                    {canMessage ? (
                      <Button asChild className="rounded-2xl">
                        <Link href={chatUrl}>
                          <MessageSquare className="mr-2 size-4" />
                          Mensagens
                        </Link>
                      </Button>
                    ) : (
                      <Button type="button" className="rounded-2xl" disabled title="Opt-in e telefone E.164 necessários">
                        <MessageSquare className="mr-2 size-4" />
                        Mensagens
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </motion.li>
          );
        })}
      </motion.ul>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Nenhum paciente nesta lista com os filtros atuais.</p>
      ) : null}
    </div>
  );
}
