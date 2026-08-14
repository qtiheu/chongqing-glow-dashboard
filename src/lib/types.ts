/** 数据 schema（与 pipeline/scraper.py 输出一致） */

export type GlowLevel = "大烧" | "中烧" | "小烧" | "微烧" | "不烧";

export interface GlowEvent {
  /** 预报日期 YYYY-MM-DD */
  date: string;
  /** 鲜艳度 0 ~ 2.5 */
  vividness: number;
  level: GlowLevel;
  /** 气溶胶光学厚度 */
  aod: number | null;
  /** 日落或日出时间 HH:MM */
  sunset_time?: string;
  sunrise_time?: string;
  /** 预报模型与时次，如 "ECMWF 2026081400z" */
  model_run: string;
}

export interface Forecast {
  city: string;
  updated_at: string;
  source: "sunsetbot" | "open-meteo" | string;
  stale: boolean;
  last_push_at: string | null;
  sunset: GlowEvent;
  sunrise: GlowEvent;
  [key: string]: unknown;
}

export interface HistoryRecord {
  date: string;
  sunrise_vividness: number;
  sunset_vividness: number;
}
