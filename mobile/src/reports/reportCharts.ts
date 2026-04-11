function escSvgText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function safeHexColor(c: string, fallback: string): string {
  return /^#[0-9A-Fa-f]{3,8}$/.test(c) ? c : fallback;
}

export function generateSparklineSVG(
  points: number[],
  color: string,
  width: number,
  height: number,
  strokeWidth = 1.5
): string {
  if (points.length === 0) return "";
  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const n = points.length;
  const coords: string[] = [];
  for (let i = 0; i < n; i++) {
    const x = n <= 1 ? pad + innerW / 2 : pad + (i / (n - 1)) * innerW;
    const y = pad + innerH - ((points[i] - min) / range) * innerH;
    coords.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  const d = coords.length === 1 ? `M ${coords[0]} L ${coords[0]}` : `M ${coords.join(" L ")}`;
  const stroke = /^#[0-9A-Fa-f]{3,8}$/.test(color) ? color : "#5856D6";
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Tendência"><path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function generateBarChartSVG(
  data: { label: string; count: number }[],
  color: string,
  width = 300,
  height = 140
): string {
  if (data.length === 0) {
    return `<svg width="${width}" height="${Math.max(40, height)}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${Math.max(40, height)}"></svg>`;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  const rows = data.length;
  const barSlot = Math.max(14, (height - 16) / rows);
  const barH = Math.max(10, barSlot - 4);
  let y = 8;
  let parts = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Frequência">`;
  const labelMaxW = 88;
  for (const d of data) {
    const label = d.label.length > 22 ? `${d.label.slice(0, 20)}…` : d.label;
    const wBar = (d.count / max) * (width - labelMaxW - 36);
    parts += `<text x="${labelMaxW}" y="${y + barH * 0.72}" text-anchor="end" font-size="8" fill="#3A3A3C" font-family="system-ui,sans-serif">${escSvgText(label)}</text>`;
    parts += `<rect x="${labelMaxW + 4}" y="${y}" width="${Math.max(2, wBar)}" height="${barH}" fill="${safeHexColor(color, "#32ADE6")}" rx="2"/>`;
    parts += `<text x="${labelMaxW + 8 + wBar + 2}" y="${y + barH * 0.72}" font-size="8" fill="#8E8E93" font-family="system-ui,sans-serif">${d.count}</text>`;
    y += barSlot;
  }
  parts += "</svg>";
  return parts;
}

function ringArc(cx: number, cy: number, radius: number, strokeWidth: number, progress: number, color: string, trackColor: string): string {
  const c = 2 * Math.PI * radius;
  const p = Math.min(1, Math.max(0, progress));
  const dash = p * c;
  const tc = safeHexColor(trackColor, "#E5E5EA");
  const col = safeHexColor(color, "#5E5CE6");
  return `
    <circle cx="${cx}" cy="${cy}" r="${radius}" stroke="${tc}" stroke-width="${strokeWidth}" fill="none"/>
    <circle cx="${cx}" cy="${cy}" r="${radius}" stroke="${col}" stroke-width="${strokeWidth}" fill="none"
      stroke-dasharray="${dash.toFixed(2)} ${c.toFixed(2)}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"/>`;
}

export function generateTreatmentRingsSVG(opts: {
  sessionProgress: number;
  timeProgress: number;
  size: number;
}): string {
  const { sessionProgress, timeProgress, size } = opts;
  const cx = size / 2;
  const cy = size / 2;
  const r1 = size * 0.36;
  const r2 = size * 0.24;
  const r3 = size * 0.14;
  const track = "#E5E5EA";
  const c1 = "#FF2D55";
  const c2 = "#5E5CE6";
  const c3 = "#34C759";
  let svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="Progresso do tratamento">`;
  svg += ringArc(cx, cy, r1, 5, sessionProgress, c1, track);
  svg += ringArc(cx, cy, r2, 5, timeProgress, c2, track);
  svg += ringArc(cx, cy, r3, 4, Math.min(1, (sessionProgress + timeProgress) / 2), c3, track);
  svg += "</svg>";
  return svg;
}
