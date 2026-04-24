import Link from "next/link";

/** Não depende de OncoCareContext — pode renderizar fora do shell autenticado. */
export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-background px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">404</p>
      <h1 className="text-2xl font-black tracking-tight text-foreground">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        O endereço pode estar incorreto ou o conteúdo foi movido. Volte ao início ou à lista de pacientes.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition hover:opacity-90"
        >
          Início
        </Link>
        <Link
          href="/pacientes"
          className="inline-flex h-11 items-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition hover:bg-muted/60"
        >
          Pacientes
        </Link>
      </div>
    </div>
  );
}
