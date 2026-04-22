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

/** Easing partilhado com `routeContentTransition` para listas e cards. */
export const listEase = [0.22, 1, 0.36, 1] as const;

/** Contêiner com stagger — envolver listas/grids. */
export const listContainerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
} as const;

/** Item de lista / card — usar com `variants` em filhos do contêiner acima. */
export const listItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: listEase },
  },
} as const;

/** Troca de painel de abas (com `AnimatePresence`). */
export const tabPanelVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: listEase },
  },
  exit: { opacity: 0, y: -4, transition: { duration: 0.18 } },
} as const;

/** Lista de cartões na fila de triagem — stagger em cascata. */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
} as const;

export const staggerCard = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  },
} as const;
