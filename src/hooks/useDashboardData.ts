import { useCallback, useEffect, useState } from "react";
import type { Forecast, HistoryRecord } from "@/lib/types";
import { FORECAST_URL, HISTORY_URL, IS_PLACEHOLDER } from "@/config";
import { SAMPLE_FORECAST, SAMPLE_HISTORY } from "@/lib/sampleData";

export interface DashboardData {
  forecast: Forecast;
  history: HistoryRecord[];
  /** 是否正在加载（骨架屏） */
  loading: boolean;
  /** 是否为示例数据（占位 URL 或抓取失败） */
  usingSample: boolean;
  /** 数据源是否标记过期 */
  stale: boolean;
  /** 是否有错误（fetch 失败） */
  error: boolean;
  refresh: () => void;
}

/** 判断返回内容是否为有效的 forecast 数据（占位文件会被识别为无效） */
function isValidForecast(v: unknown): v is Forecast {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.placeholder === true) return false;
  return !!o.sunset && !!o.sunrise && typeof o.city === "string";
}

function isValidHistory(v: unknown): v is HistoryRecord[] {
  return Array.isArray(v) && v.every((r) => r && typeof r === "object" && "date" in r);
}

async function fetchJson<T>(url: string, validate: (v: unknown) => v is T): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return validate(data) ? data : null;
  } catch {
    return null;
  }
}

export function useDashboardData(): DashboardData {
  const [forecast, setForecast] = useState<Forecast>(SAMPLE_FORECAST);
  const [history, setHistory] = useState<HistoryRecord[]>(SAMPLE_HISTORY);
  const [loading, setLoading] = useState(true);
  const [usingSample, setUsingSample] = useState(IS_PLACEHOLDER);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    if (IS_PLACEHOLDER) {
      // 占位 URL：直接展示示例数据并标注
      setForecast(SAMPLE_FORECAST);
      setHistory(SAMPLE_HISTORY);
      setUsingSample(true);
      setStale(false);
      setError(false);
      setLoading(false);
      return;
    }

    const [f, h] = await Promise.all([
      fetchJson<Forecast>(FORECAST_URL, isValidForecast),
      fetchJson<HistoryRecord[]>(HISTORY_URL, isValidHistory),
    ]);

    const failed = !f || !h;
    setForecast(f ?? SAMPLE_FORECAST);
    setHistory(h ?? SAMPLE_HISTORY);
    setUsingSample(failed);
    setStale(failed ? false : (f?.stale ?? false));
    setError(failed);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { forecast, history, loading, usingSample, stale, error, refresh: () => void load() };
}
