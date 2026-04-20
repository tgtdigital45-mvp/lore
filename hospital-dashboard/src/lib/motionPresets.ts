/** Presets partilhados para modais e overlays (Framer Motion). */
export const modalOverlayTransition = { duration: 0.22 } as const;

export const modalPanelEase = [0.16, 1, 0.3, 1] as const;

export const modalPanelTransition = {
  duration: 0.26,
  ease: modalPanelEase,
} as const;

/** Transição do `<main>` ao mudar de rota (OncoCareLayout). */
export const routeContentTransition = {
  duration: 0.34,
  ease: [0.22, 1, 0.36, 1] as const,
} as const;
