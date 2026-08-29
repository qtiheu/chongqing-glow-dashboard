import type { GlowLevel } from "@/lib/types";

/** 五档等级配置：颜色、徽章样式、描述 */
export interface LevelMeta {
  level: GlowLevel;
  range: string;
  /** badge 类名 */
  badge: string;
  /** 大数字颜色 */
  color: string;
  /** 实拍效果描述 */
  desc: string;
  /** 用于图例的 hex */
  hex: string;
}

export const LEVELS: LevelMeta[] = [
  {
    level: "大烧",
    range: "≥ 0.8",
    badge: "border-transparent bg-gradient-to-r from-red-700 to-red-500 text-white glow-fire",
    color: "text-red-400",
    desc: "色彩饱满、范围广，值得专程拍摄的火烧云",
    hex: "#ef4444",
  },
  {
    level: "中烧",
    range: "0.6 ~ 0.8",
    badge: "border-transparent bg-rose-500/90 text-white",
    color: "text-rose-400",
    desc: "色彩与范围都不错，值得出门的级别",
    hex: "#f43f5e",
  },
  {
    level: "小烧",
    range: "0.4 ~ 0.6",
    badge: "border-transparent bg-orange-500/90 text-white",
    color: "text-orange-400",
    desc: "有一定色彩，可观望后再定",
    hex: "#f97316",
  },
  {
    level: "微烧",
    range: "0.2 ~ 0.4",
    badge: "border-transparent bg-amber-300/80 text-amber-950",
    color: "text-amber-300",
    desc: "色彩很淡，几乎可以忽略",
    hex: "#fbbf24",
  },
  {
    level: "不烧",
    range: "< 0.2",
    badge: "border-transparent bg-zinc-500/60 text-zinc-100",
    color: "text-zinc-400",
    desc: "无明显火烧云，安心休息",
    hex: "#a1a1aa",
  },
];

export function levelMeta(level: string): LevelMeta {
  return LEVELS.find((l) => l.level === level) ?? LEVELS[LEVELS.length - 1];
}

export type Verdict = "值得出门" | "可观望" | "不用等";

/** ≥0.6 值得出门，0.4~0.6 可观望，<0.4 不用等 */
export function verdictOf(vividness: number): Verdict {
  if (vividness >= 0.6) return "值得出门";
  if (vividness >= 0.4) return "可观望";
  return "不用等";
}

export function aodLabel(aod: number | null | undefined): string {
  if (aod == null) return "未知";
  if (aod < 0.25) return "通透";
  if (aod <= 0.45) return "一般";
  return "较差";
}

export function sourceLabel(source: string): string {
  if (source === "sunsetbot") return "SunsetBot（ECMWF/GFS + CAMS）";
  if (source === "open-meteo-ecmwf") return "Open-Meteo ECMWF IFS + CAMS";
  if (source === "open-meteo") return "Open-Meteo（简化评分）";
  return source || "未知";
}

/** 预计持续时长格式化：分钟 → "约 X 分钟"；未知返回 "—" */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "—";
  return `约 ${Math.round(minutes)} 分钟`;
}

export function formatUpdated(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch {
    return iso;
  }
}
