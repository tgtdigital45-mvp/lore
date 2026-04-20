const STORAGE_KEY = "oncocare_dashboard_settings_v1";

export interface DashboardSettings {
  hospitalName: string;
  logoDataUrl: string | null;
  sidebarBg: string;
  appBg: string;
}

const DEFAULTS: DashboardSettings = {
  hospitalName: "Hospital",
  logoDataUrl: null,
  sidebarBg: "#f0f1f3",
  appBg: "#f3f4f6",
};

export const SIDEBAR_BG_PRESETS = [
  { label: "Cinza (padrão)", value: "#f0f1f3" },
  { label: "Branco", value: "#ffffff" },
  { label: "Azul suave", value: "#eff6ff" },
  { label: "Verde suave", value: "#f0fdf4" },
  { label: "Violeta suave", value: "#faf5ff" },
  { label: "Creme", value: "#fefce8" },
];

export const APP_BG_PRESETS = [
  { label: "Cinza (padrão)", value: "#f3f4f6" },
  { label: "Branco", value: "#ffffff" },
  { label: "Azul claro", value: "#f0f9ff" },
  { label: "Verde claro", value: "#f0fdf4" },
  { label: "Ardósia clara", value: "#f8fafc" },
];

export function loadDashboardSettings(): DashboardSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DashboardSettings>) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveDashboardSettings(patch: Partial<DashboardSettings>): DashboardSettings {
  const next = { ...loadDashboardSettings(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("oncocare-settings-change", { detail: next }));
  } catch {
    // storage unavailable
  }
  return next;
}

export function resetDashboardSettings(): DashboardSettings {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("oncocare-settings-change", { detail: { ...DEFAULTS } }));
  } catch {
    // ignore
  }
  return { ...DEFAULTS };
}

/** Menu lateral colapsável (apenas layout desktop `lg+`). */
const SIDEBAR_COLLAPSED_KEY = "oncocare_sidebar_collapsed_v1";

export function loadSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
    window.dispatchEvent(new CustomEvent("oncocare-sidebar-collapsed-change", { detail: collapsed }));
  } catch {
    // ignore
  }
}
