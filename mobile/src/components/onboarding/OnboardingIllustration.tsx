import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

type Variant = "resumo" | "sintomas" | "privacidade";

type Props = {
  variant: Variant;
  accent: string;
  width: number;
  height: number;
};

/** Ilustrações vetoriais leves para o tour inicial (escalam com width/height). */
export function OnboardingIllustration({ variant, accent, width, height }: Props) {
  const w = width;
  const h = height;

  if (variant === "resumo") {
    return (
      <Svg width={w} height={h} viewBox="0 0 280 200" preserveAspectRatio="xMidYMid meet">
        <Defs>
          <LinearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={accent} stopOpacity="0.35" />
            <Stop offset="1" stopColor={accent} stopOpacity="0.08" />
          </LinearGradient>
        </Defs>
        <Rect x="24" y="28" width="232" height="144" rx="20" fill="url(#g1)" />
        <Rect x="44" y="52" width="72" height="48" rx="10" fill={accent} opacity={0.9} />
        <Rect x="128" y="52" width="108" height="20" rx="6" fill={accent} opacity={0.35} />
        <Rect x="128" y="80" width="88" height="12" rx="4" fill={accent} opacity={0.2} />
        <Rect x="44" y="112" width="192" height="44" rx="10" fill={accent} opacity={0.15} />
        <Path
          d="M52 128 L68 108 L84 118 L100 96 L116 112 L132 100 L148 120 L164 104 L180 124 L196 108 L212 128"
          stroke={accent}
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx="230" cy="44" r="8" fill={accent} />
      </Svg>
    );
  }

  if (variant === "sintomas") {
    return (
      <Svg width={w} height={h} viewBox="0 0 280 200" preserveAspectRatio="xMidYMid meet">
        <Defs>
          <LinearGradient id="g2" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={accent} stopOpacity="0.4" />
            <Stop offset="1" stopColor={accent} stopOpacity="0.06" />
          </LinearGradient>
        </Defs>
        <Circle cx="140" cy="100" r="72" fill="url(#g2)" />
        <Path
          d="M88 100 Q112 72 140 88 Q168 72 192 100 Q180 132 140 140 Q100 132 88 100 Z"
          fill={accent}
          opacity={0.85}
        />
        <Path
          d="M120 96 L128 108 L156 76"
          stroke="#FFFFFF"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Rect x="56" y="156" width="168" height="10" rx="5" fill={accent} opacity={0.2} />
        <Path d="M72 156 L88 132 L104 148 L120 124 L136 140 L152 118 L168 132 L184 112 L200 128 L216 156" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />
      </Svg>
    );
  }

  /* privacidade */
  return (
    <Svg width={w} height={h} viewBox="0 0 280 200" preserveAspectRatio="xMidYMid meet">
      <Defs>
        <LinearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity="0.45" />
          <Stop offset="1" stopColor={accent} stopOpacity="0.1" />
        </LinearGradient>
      </Defs>
      <Path
        d="M140 32 L200 52 L200 112 Q200 156 140 176 Q80 156 80 112 L80 52 Z"
        fill="url(#g3)"
        stroke={accent}
        strokeWidth="3"
      />
      <Rect x="118" y="76" width="44" height="36" rx="6" fill="#FFFFFF" opacity={0.95} />
      <Path d="M128 96 L136 104 L152 84" stroke={accent} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="140" cy="48" r="10" fill={accent} opacity={0.9} />
      <Rect x="52" y="164" width="176" height="8" rx="4" fill={accent} opacity={0.15} />
    </Svg>
  );
}
