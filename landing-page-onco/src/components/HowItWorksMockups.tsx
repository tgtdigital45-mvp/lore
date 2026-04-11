/** Ilustrações estilo wireframe para simulação (não são telas reais do app). */

export function MockupProfile() {
  return (
    <svg viewBox="0 0 220 280" className="mx-auto h-44 w-full max-w-[220px]" aria-hidden>
      <defs>
        <linearGradient id="mp-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F2F2F7" />
          <stop offset="100%" stopColor="#FFFFFF" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="204" height="264" rx="28" fill="url(#mp-bg)" stroke="#E5E5EA" strokeWidth="2" />
      <rect x="28" y="32" width="164" height="14" rx="6" fill="#C7C7CC" opacity="0.6" />
      <rect x="28" y="56" width="120" height="10" rx="4" fill="#E5E5EA" />
      <rect x="28" y="88" width="164" height="40" rx="10" fill="#FFFFFF" stroke="#E5E5EA" />
      <rect x="40" y="100" width="80" height="8" rx="3" fill="#007AFF" opacity="0.35" />
      <rect x="28" y="140" width="164" height="40" rx="10" fill="#FFFFFF" stroke="#E5E5EA" />
      <rect x="40" y="152" width="100" height="8" rx="3" fill="#34C759" opacity="0.3" />
      <rect x="28" y="192" width="164" height="44" rx="12" fill="#007AFF" opacity="0.9" />
      <text x="110" y="220" textAnchor="middle" fill="white" fontSize="11" fontFamily="system-ui, sans-serif">
        Continuar
      </text>
    </svg>
  )
}

export function MockupDiary() {
  return (
    <svg viewBox="0 0 220 280" className="mx-auto h-44 w-full max-w-[220px]" aria-hidden>
      <rect x="8" y="8" width="204" height="264" rx="28" fill="#F2F2F7" stroke="#E5E5EA" strokeWidth="2" />
      <rect x="28" y="32" width="100" height="12" rx="5" fill="#636366" opacity="0.35" />
      <rect x="28" y="56" width="164" height="36" rx="10" fill="#FFFFFF" stroke="#E5E5EA" />
      <text x="40" y="78" fill="#8E8E93" fontSize="10" fontFamily="system-ui, sans-serif">
        Como você está?
      </text>
      <rect x="36" y="108" width="148" height="8" rx="3" fill="#007AFF" opacity="0.5" />
      <rect x="36" y="124" width="120" height="6" rx="2" fill="#C7C7CC" />
      <rect x="36" y="148" width="148" height="8" rx="3" fill="#FF9500" opacity="0.45" />
      <rect x="36" y="164" width="100" height="6" rx="2" fill="#C7C7CC" />
      <rect x="36" y="188" width="148" height="8" rx="3" fill="#34C759" opacity="0.4" />
      <rect x="36" y="204" width="110" height="6" rx="2" fill="#C7C7CC" />
      <rect x="48" y="232" width="124" height="28" rx="14" fill="#007AFF" />
      <text x="110" y="250" textAnchor="middle" fill="white" fontSize="10" fontFamily="system-ui, sans-serif">
        Salvar
      </text>
    </svg>
  )
}

export function MockupPdf() {
  return (
    <svg viewBox="0 0 220 280" className="mx-auto h-44 w-full max-w-[220px]" aria-hidden>
      <rect x="8" y="8" width="204" height="264" rx="28" fill="#FFFFFF" stroke="#E5E5EA" strokeWidth="2" />
      <rect x="36" y="40" width="52" height="64" rx="6" fill="#FF3B30" opacity="0.85" />
      <text x="62" y="82" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold" fontFamily="system-ui, sans-serif">
        PDF
      </text>
      <rect x="100" y="44" width="84" height="10" rx="3" fill="#1C1C1E" opacity="0.2" />
      <rect x="100" y="62" width="64" height="8" rx="3" fill="#C7C7CC" />
      <rect x="36" y="120" width="148" height="56" rx="8" fill="#F2F2F7" stroke="#E5E5EA" />
      <path
        d="M48 168 L72 148 L96 158 L120 132 L172 168 Z"
        fill="none"
        stroke="#007AFF"
        strokeWidth="2"
        opacity="0.6"
      />
      <rect x="36" y="188" width="148" height="8" rx="2" fill="#E5E5EA" />
      <rect x="36" y="202" width="120" height="8" rx="2" fill="#E5E5EA" />
      <rect x="36" y="216" width="100" height="8" rx="2" fill="#E5E5EA" />
      <rect x="48" y="240" width="124" height="28" rx="14" fill="#34C759" opacity="0.9" />
      <text x="110" y="258" textAnchor="middle" fill="white" fontSize="10" fontFamily="system-ui, sans-serif">
        Compartilhar
      </text>
    </svg>
  )
}
