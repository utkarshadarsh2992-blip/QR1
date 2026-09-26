export const ECC_LEVELS = ["L", "M", "Q", "H"] as const;
export type EccLevel = (typeof ECC_LEVELS)[number];

export const ECC_OPTIONS: {
  id: EccLevel;
  name: string;
  recovery: string;
  hint: string;
}[] = [
  { id: "L", name: "Low", recovery: "~7%", hint: "Smallest code. Fine for screens." },
  { id: "M", name: "Medium", recovery: "~15%", hint: "Balanced default for most uses." },
  { id: "Q", name: "Quartile", recovery: "~25%", hint: "Better if the print might scuff." },
  { id: "H", name: "High", recovery: "~30%", hint: "Most durable. Largest pattern." },
];

export const SIZE_MIN = 128;
export const SIZE_MAX = 1024;
export const SIZE_STEP = 8;
export const SIZE_DEFAULT = 256;

const HEX6 = /^#([0-9a-f]{6})$/i;

export function normalizeHex(value: string, fallback: string): string {
  const trimmed = value.trim();
  if (HEX6.test(trimmed)) return `#${trimmed.slice(1).toLowerCase()}`;
  if (/^[0-9a-f]{6}$/i.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return fallback;
}

export function isHexColor(value: string): boolean {
  return HEX6.test(value.trim());
}

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const raw = hex.replace("#", "");
  const r = channelToLinear(parseInt(raw.slice(0, 2), 16));
  const g = channelToLinear(parseInt(raw.slice(2, 4), 16));
  const b = channelToLinear(parseInt(raw.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** QR scanners typically fail below ~2:1; 3:1 is a cautious floor. */
export function contrastWarning(fg: string, bg: string): string | null {
  if (!isHexColor(fg) || !isHexColor(bg)) return null;
  const ratio = contrastRatio(fg, bg);
  if (ratio < 2) return "These colors are too similar. Most cameras will not scan this code.";
  if (ratio < 3) return "Low contrast. Try a darker foreground or a lighter background.";
  return null;
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
