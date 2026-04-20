import {
  Ellipsis,
  FileDown,
  GitBranch,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type DossierActionBarProps = {
  onRefresh?: () => void;
  onExportPdf?: () => void;
  onSave?: () => void;
  /** Relatório de evolução assistido por IA (Edge Function) */
  onAiEvolution?: () => void;
  /** Desabilitar ações enquanto dados carregam */
  busy?: boolean;
  aiBusy?: boolean;
  className?: string;
};

/**
 * Barra superior estilo Dynamics — ações em botões ghost.
 */
export function DossierActionBar({ onRefresh, onExportPdf, onSave, onAiEvolution, busy, aiBusy, className }: DossierActionBarProps) {
  const ghost =
    "h-9 gap-2 rounded-2xl border-0 bg-transparent px-3 text-slate-500 shadow-none transition-all duration-200 hover:bg-slate-100 hover:text-slate-900";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 border-b border-slate-100 bg-white/95 px-3 py-2 backdrop-blur-sm md:px-6",
        className
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className={ghost} disabled={busy} onClick={onSave}>
            <Save className="size-4 shrink-0" />
            <span className="hidden sm:inline">Salvar</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Salvar alterações locais (quando aplicável)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className={ghost} disabled>
            <Plus className="size-4 shrink-0" />
            <span className="hidden sm:inline">Novo</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Em breve</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className={ghost} disabled>
            <Trash2 className="size-4 shrink-0" />
            <span className="hidden lg:inline">Excluir</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Em breve</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className={ghost} disabled={busy} onClick={onRefresh}>
            <RefreshCw className={cn("size-4 shrink-0", busy && "animate-spin")} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Recarregar dados do paciente</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className={ghost} disabled>
            <ShieldCheck className="size-4 shrink-0" />
            <span className="hidden xl:inline">Verificar acesso</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Em breve</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className={ghost} disabled={busy} onClick={onExportPdf}>
            <FileDown className="size-4 shrink-0" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Exportar relatório PDF</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={ghost}
            disabled={busy || aiBusy || !onAiEvolution}
            onClick={onAiEvolution}
          >
            <Sparkles className="size-4 shrink-0" />
            <span className="hidden xl:inline">Evolução IA</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Gerar relatório de evolução (LLM)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className={ghost} disabled>
            <GitBranch className="size-4 shrink-0" />
            <span className="hidden xl:inline">Processos</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Em breve</TooltipContent>
      </Tooltip>

      <Button type="button" variant="ghost" size="icon" className={cn(ghost, "ml-auto")} aria-label="Mais opções" disabled>
        <Ellipsis className="size-4" />
      </Button>
    </div>
  );
}
