export const DASHBOARD_TABS = [
  "painel",
  "pacientes",
  "mensagens",
  "integracao",
  "gestao",
  "configuracoes",
] as const;

export type DashboardTab = (typeof DASHBOARD_TABS)[number];

export function pathnameToTab(pathname: string): DashboardTab {
  const seg = pathname.replace(/^\//, "").split("/")[0] || "painel";
  if ((DASHBOARD_TABS as readonly string[]).includes(seg)) return seg as DashboardTab;
  return "painel";
}

export function tabToPath(tab: DashboardTab): string {
  return `/${tab}`;
}
