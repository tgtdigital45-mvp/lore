"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Rótulo amigável exibido no fallback (ex.: "Sinais vitais"). */
  label?: string;
  /** Se `true`, exibe layout compacto (uma única linha). */
  compact?: boolean;
};

type State = { hasError: boolean; message: string | null };

/**
 * Error Boundary granular para painéis/cards do dossiê.
 *
 * Diferente do `ErrorBoundary` global, este:
 * - Não derruba o dossiê inteiro se um painel falhar;
 * - Permite retry local (re-monta o subtree);
 * - Usa o design system do projeto (classes Tailwind).
 */
export class PanelErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(`[PanelErrorBoundary:${this.props.label ?? "?"}]`, err, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { label, compact } = this.props;

    if (compact) {
      return (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-sm text-rose-800"
        >
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            {label ? `Erro ao carregar ${label}` : "Erro ao carregar painel"}
          </span>
          <button
            type="button"
            onClick={this.handleRetry}
            className="ml-auto inline-flex items-center gap-1 rounded-xl bg-white px-2.5 py-1 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
          >
            <RotateCcw className="size-3" aria-hidden />
            Tentar novamente
          </button>
        </div>
      );
    }

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/60 px-6 py-10 text-center"
      >
        <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-100">
          <AlertCircle className="size-6 text-rose-600" aria-hidden />
        </div>
        <div className="max-w-sm space-y-1">
          <p className="text-sm font-bold text-rose-900">
            {label ? `Não foi possível carregar: ${label}` : "Erro ao carregar painel"}
          </p>
          {this.state.message ? (
            <p className="text-xs text-rose-700/80">{this.state.message}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={this.handleRetry}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Tentar novamente
        </button>
      </div>
    );
  }
}
