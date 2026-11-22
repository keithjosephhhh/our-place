export type FrameKind = "round" | "circle" | "arch" | "heart" | "polaroid";
export type SceneKind = "sunset" | "cabin" | "stars" | "clouds" | "picnic";
export type FilterKind = "none" | "warm" | "soft" | "vintage" | "mono" | "dreamy";

export type FitKind = "cover" | "contain";
export interface StageStyle { scene: SceneKind; frame: FrameKind; color: string; filter: FilterKind; fit: FitKind }

export const DEFAULT_STYLE: StageStyle = { scene: "sunset", frame: "round", color: "#FFFFFF", filter: "warm", fit: "cover" };

export const SCENES: { id: SceneKind; label: string; emoji: string }[] = [
  { id: "sunset", label: "Sunset beach", emoji: "🌅" },
  { id: "cabin", label: "Cozy cabin", emoji: "🏡" },
  { id: "stars", label: "Starry dusk", emoji: "✨" },
  { id: "clouds", label: "Cloudy day", emoji: "☁️" },
  { id: "picnic", label: "Picnic blanket", emoji: "🧺" },
];
export const FRAMES: { id: FrameKind; label: string; emoji: string }[] = [
  { id: "round", label: "Soft", emoji: "▢" },
  { id: "circle", label: "Circle", emoji: "◯" },
  { id: "arch", label: "Arch", emoji: "⛩" },
  { id: "heart", label: "Heart", emoji: "💗" },
  { id: "polaroid", label: "Polaroid", emoji: "🖼" },
];
export const FILTERS: { id: FilterKind; label: string }[] = [
  { id: "none", label: "Natural" }, { id: "warm", label: "Warm" }, { id: "soft", label: "Soft" },
  { id: "vintage", label: "Vintage" }, { id: "mono", label: "Black & white" }, { id: "dreamy", label: "Dreamy" },
];
export const FILTER_CSS: Record<FilterKind, string> = {
  none: "",
  warm: "sepia(0.25) saturate(1.2) contrast(1.05)",
  soft: "brightness(1.08) contrast(0.92) saturate(1.1)",
  vintage: "sepia(0.5) contrast(0.9) brightness(1.05)",
  mono: "grayscale(1) contrast(1.05)",
  dreamy: "brightness(1.1) saturate(1.3) hue-rotate(-12deg)",
};
export const FRAME_COLORS = ["#FFFFFF", "#FFD6E7", "#D6307E", "#DCCBFF", "#CDEFD3", "#F2D9A6"];
export const PEN_COLORS = ["#FFFFFF", "#E2428F", "#F2A65A", "#F5D847", "#6CC49A", "#5BA8E0", "#A98BE0", "#141218"];
export const STAMPS = ["❤️", "⭐", "🌸", "🐚", "☁️", "😘", "🌈", "🎉"];

export function loadStyle(): StageStyle {
  try {
    const raw = localStorage.getItem("stageStyle");
    if (raw) return { ...DEFAULT_STYLE, ...JSON.parse(raw) };
  } catch { /* storage unavailable: fall back to defaults */ }
  return DEFAULT_STYLE;
}
