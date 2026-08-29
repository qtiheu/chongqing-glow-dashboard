#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
重庆朝霞 / 晚霞鲜艳度预报抓取器
=================================

主数据源  : sunsetbot.top（免费火烧云预测站，基于 ECMWF/GFS 云况 + CAMS 气溶胶）
           接口: GET https://sunsetbot.top/?intend=select_city&query_city={城市}&event={事件}&model={模型}
           event 取值: set_1=今天日落 / rise_2=明天日出; model 取值: EC / GFS
降级数据源: Open-Meteo（免费 API，无需 key）
           第一优先: ECMWF IFS 0.25° 高精度模型（models=ecmwf_ifs025，与主源同源的 ECMWF 数据）
           第二优先: Open-Meteo 默认模型（兜底）
           综合 高/中/低云覆盖率 + CAMS 气溶胶 + 湿度 + 能见度 + 降水概率
           用简化评分模型计算 0~2.5 鲜艳度

输出:
    data/forecast.json  最新预报（city/updated_at/source/stale/last_push_at/sunset/sunrise）
    data/history.json   近 30 天历史（{date, sunrise_vividness, sunset_vividness}）

健壮性:
    - UA / 超时 / 每次请求重试 2 次
    - 主源连续失败自动降级 Open-Meteo（ECMWF IFS → 默认模型），并在 source 字段标注
    - 全源失败时保留旧 JSON 并写 "stale": true，绝不静默失败
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import requests

# 统一 UTF-8 输出（Windows 控制台 GBK 下 emoji 日志会崩溃；CI 里也保持稳定）
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# 配置
# ---------------------------------------------------------------------------
CITY = "重庆"
CHONGQING_LAT, CHONGQING_LON = 29.563, 106.551  # 重庆主城坐标（降级源用）

SUNSETBOT_URL = "https://sunsetbot.top/"
OPENMETEO_URL = "https://api.open-meteo.com/v1/forecast"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
TIMEOUT = 25          # 秒
HTTP_RETRIES = 2      # 每次请求重试次数
MAIN_FAIL_TOLERANCE = 2  # 主源连续失败 N 次后，本轮直接走降级源

HISTORY_MAX = 30      # 历史保留天数

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # 仓库根目录
DATA_DIR = os.path.join(BASE_DIR, "data")
FORECAST_PATH = os.path.join(DATA_DIR, "forecast.json")
HISTORY_PATH = os.path.join(DATA_DIR, "history.json")

# 主源连续失败计数（记录在 forecast.json 内，跨运行生效）
FAIL_COUNT_KEY = "sunsetbot_fail_count"

# ---------------------------------------------------------------------------
# 工具函数
# ---------------------------------------------------------------------------
def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def http_get(url: str, params: Optional[dict] = None) -> requests.Response:
    """带 UA/超时/重试的 GET。重试耗尽后抛异常。"""
    last_err: Optional[Exception] = None
    for attempt in range(HTTP_RETRIES + 1):
        try:
            r = requests.get(url, params=params, headers={"User-Agent": UA}, timeout=TIMEOUT)
            r.raise_for_status()
            return r
        except Exception as e:  # noqa: BLE001
            last_err = e
            log(f"  ⚠ http_get 失败(第{attempt + 1}次): {url} -> {e!r}")
    raise RuntimeError(f"GET {url} 重试 {HTTP_RETRIES} 次后仍失败: {last_err!r}")


def level_of(vividness: float) -> str:
    """统一等级映射。"""
    if vividness >= 0.8:
        return "大烧"
    if vividness >= 0.6:
        return "中烧"
    if vividness >= 0.4:
        return "小烧"
    if vividness >= 0.2:
        return "微烧"
    return "不烧"


def aod_label(aod: Optional[float]) -> str:
    """气溶胶通透度标注。"""
    if aod is None:
        return "未知"
    if aod < 0.25:
        return "通透"
    if aod <= 0.45:
        return "一般"
    return "较差"


def first_float(s: str) -> Optional[float]:
    """从 '0.36（中小烧）' 这类字符串提取首个浮点数。"""
    m = re.search(r"\d+(?:\.\d+)?", s)
    return float(m.group(0)) if m else None


def load_json(path: str, default: Any) -> Any:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return default


def save_json(path: str, obj: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def now_iso() -> str:
    """北京时间 ISO 字符串（无论 runner 时区，统一 +08:00）。"""
    bj = datetime.now(timezone(timedelta(hours=8)))
    return bj.isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# 主源: sunsetbot.top
# ---------------------------------------------------------------------------
def fetch_sunsetbot() -> dict:
    """抓取重庆 今天日落(set_1) + 明天日出(rise_2)。EC 优先，无该时次预报时回退 GFS。"""
    results = {}
    queries = {
        "sunset": ("set_1", "日落"),
        "sunrise": ("rise_2", "日出"),
    }
    for key, (event, _cn) in queries.items():
        got: Optional[dict] = None
        for model in ("EC", "GFS"):
            params = {"intend": "select_city", "query_city": CITY, "event": event, "model": model}
            log(f"主源 sunsetbot: 请求 {key} event={event} model={model}")
            try:
                r = http_get(SUNSETBOT_URL, params=params)
                data = r.json()
                if data.get("status") != "ok":
                    raise RuntimeError(f"status != ok: {data}")
                if not data.get("tb_quality") or data["tb_quality"] == "-":
                    raise RuntimeError(f"该时次无预报: {data.get('img_summary', '')}")
                q = first_float(data["tb_quality"])
                if q is None:
                    raise RuntimeError(f"tb_quality 解析失败: {data['tb_quality']}")
                event_time = (data.get("tb_event_time") or "").strip()  # 形如 2026-08-14 19:34:18
                dt = datetime.strptime(event_time[:16], "%Y-%m-%d %H:%M") if len(event_time) >= 16 else None
                if dt is None:
                    raise RuntimeError(f"tb_event_time 解析失败: {event_time}")
                time_field = "sunset_time" if key == "sunset" else "sunrise_time"
                model_disp = data.get("display_model") or model
                times_name = data.get("display_times_name") or ""
                times_str = data.get("display_times_str") or ""
                run_str = f"{model_disp} {times_name} ({times_str})".strip()
                got = {
                    "date": dt.strftime("%Y-%m-%d"),
                    "vividness": q,
                    "level": level_of(q),
                    "aod": first_float(data.get("tb_aod") or ""),
                    time_field: dt.strftime("%H:%M"),
                    "model_run": run_str,
                }
                log(f"  ✓ {key}[{model}]: vividness={q} aod={got['aod']} time={event_time} run={run_str}")
                break
            except Exception as e:  # noqa: BLE001
                log(f"  ⚠ {key}[{model}] 失败: {e!r}")
        if got is None:
            raise RuntimeError(f"sunsetbot {key} 在 EC/GFS 均无有效预报")
        results[key] = got
    return results


# ---------------------------------------------------------------------------
# 降级源: Open-Meteo + 简化评分模型
# ---------------------------------------------------------------------------
def _hourly_series(data: dict, field: str) -> list:
    return data.get("hourly", {}).get(field, [])


def _window_mean(series: list, times: list, center: str, span_hours: float = 1.5) -> Optional[float]:
    """取 center(如 '19:42') 前后 span_hours 小时内所有时次的平均值；无数据返回 None。"""
    try:
        ch, cm = (int(x) for x in center.split(":"))
    except Exception:
        return None
    vals = []
    for t, v in zip(times, series):
        if v is None:
            continue
        hh = int(t[11:13])
        mm = int(t[14:16])
        diff = (hh * 60 + mm) - (ch * 60 + cm)
        if -span_hours * 60 <= diff <= span_hours * 60:
            vals.append(v)
    return sum(vals) / len(vals) if vals else None


def _vividness_score(cloud_low, cloud_mid, cloud_high, aod, humidity, visibility_km, precip_prob):
    """
    简化评分模型 → 0~2.5 鲜艳度。
    思路:
      - 中高云是"画布": 覆盖率太低无云可烧，太高又遮天，理想区间 30%~75% 给高分
      - 低云遮挡地平线 → 扣分
      - AOD 0.1~0.3 最通透给加成，>0.6 明显衰减
      - 湿度 >75%、能见度 <12km、降水概率 >30% 逐项扣分
    """
    mid_high = (cloud_mid + cloud_high) / 2.0 if (cloud_mid is not None and cloud_high is not None) else None
    if mid_high is None:
        return 0.0

    # 1) 云况基础分 (0 ~ 1.4)
    if mid_high < 30:
        cloud_score = mid_high / 30.0 * 0.9          # 无云 → 趋近 0
    elif mid_high <= 75:
        cloud_score = 0.9 + (mid_high - 30) / 45.0 * 0.5   # 30→75: 0.9→1.4
    else:
        cloud_score = 1.4 - (mid_high - 75) / 25.0 * 1.0   # 75→100: 1.4→0.4

    # 2) 低云遮挡惩罚 (0 ~ 0.5)
    low_pen = 0.0 if cloud_low is None else min(0.5, cloud_low / 100.0 * 0.8)

    # 3) AOD 调整 (-0.4 ~ +0.3)
    if aod is None:
        aod_adj = 0.0
    elif aod <= 0.3:
        aod_adj = 0.3 - abs(aod - 0.15) * 2.0        # 0.15 最佳 +0.3
    elif aod <= 0.6:
        aod_adj = 0.3 - (aod - 0.3) / 0.3 * 0.4      # 0.3→0.6: +0.3→-0.1
    else:
        aod_adj = -0.1 - (aod - 0.6) / 0.6 * 0.3     # 0.6→1.2+: -0.1→-0.4

    # 4) 湿度惩罚
    hum_pen = 0.0 if humidity is None else max(0.0, (humidity - 75) / 25.0 * 0.3)

    # 5) 能见度惩罚 (km, <12km 开始扣)
    vis_pen = 0.0 if visibility_km is None else max(0.0, (12 - visibility_km) / 12.0 * 0.4)

    # 6) 降水概率惩罚 (>30%)
    prec_pen = 0.0 if precip_prob is None else max(0.0, (precip_prob - 30) / 70.0 * 0.6)

    score = cloud_score - low_pen + aod_adj - hum_pen - vis_pen - prec_pen
    return round(max(0.0, min(2.5, score)), 2)


def fetch_openmeteo(model: str = "ecmwf_ifs025") -> dict:
    """
    Open-Meteo 降级抓取。
    model: "ecmwf_ifs025"（ECMWF IFS 0.25° 高精度，默认）或 None（Open-Meteo 默认模型兜底）。
    """
    model_label = "ECMWF IFS 0.25°" if model else "默认模型"
    log(f"降级源 Open-Meteo[{model_label}]: 抓取云况/湿度/能见度/降水 + 日出日落")
    params = {
        "latitude": CHONGQING_LAT,
        "longitude": CHONGQING_LON,
        "hourly": ("cloud_cover_low,cloud_cover_mid,cloud_cover_high,"
                   "relative_humidity_2m,visibility,precipitation_probability"),
        "daily": "sunrise,sunset",
        "timezone": "Asia/Shanghai",
        "forecast_days": 2,
    }
    if model:
        params["models"] = model
    fc = http_get(OPENMETEO_URL, params=params).json()

    aq_params = {
        "latitude": CHONGQING_LAT,
        "longitude": CHONGQING_LON,
        "hourly": "aerosol_optical_depth",
        "models": "cams_global",
        "timezone": "Asia/Shanghai",
        "forecast_days": 2,
    }
    aq = http_get(AIR_QUALITY_URL, params=aq_params).json()

    times = _hourly_series(fc, "time")
    daily = fc.get("daily", {})
    sunset_dt = daily.get("sunset", [None])[0]   # 今天日落
    sunrise_dt = daily.get("sunrise", [None])[1]  # 明天日出

    def build_event(center_dt: Optional[str], is_sunset: bool) -> dict:
        if not center_dt:
            raise RuntimeError("Open-Meteo 未返回日出/日落时间")
        center = center_dt[11:16]
        date = center_dt[:10]
        aod = _window_mean(_hourly_series(aq, "aerosol_optical_depth"), times, center)
        cloud_low = _window_mean(_hourly_series(fc, "cloud_cover_low"), times, center)
        cloud_mid = _window_mean(_hourly_series(fc, "cloud_cover_mid"), times, center)
        cloud_high = _window_mean(_hourly_series(fc, "cloud_cover_high"), times, center)
        humidity = _window_mean(_hourly_series(fc, "relative_humidity_2m"), times, center)
        vis_m = _window_mean(_hourly_series(fc, "visibility"), times, center)
        prec = _window_mean(_hourly_series(fc, "precipitation_probability"), times, center)
        visibility_km = None if vis_m is None else vis_m / 1000.0

        vividness = _vividness_score(cloud_low, cloud_mid, cloud_high, aod, humidity, visibility_km, prec)
        log(f"  ✓ {'日落' if is_sunset else '日出'} {center}: vividness={vividness} "
            f"(cloud_low={cloud_low} mid={cloud_mid} high={cloud_high} aod={aod} "
            f"hum={humidity} vis={visibility_km} prec={prec})")

        field = "sunset_time" if is_sunset else "sunrise_time"
        return {
            "date": date,
            "vividness": vividness,
            "level": level_of(vividness),
            "aod": aod,
            "model_run": f"Open-Meteo {model_label} + CAMS 简化评分",
            field: center,
        }

    sunset = build_event(sunset_dt, True)
    sunrise = build_event(sunrise_dt, False)
    return {"sunset": sunset, "sunrise": sunrise}


# ---------------------------------------------------------------------------
# 历史维护
# ---------------------------------------------------------------------------
def update_history(forecast: dict) -> None:
    """追加今日记录（同一天覆盖），保留近 HISTORY_MAX 天。"""
    history = load_json(HISTORY_PATH, [])
    if not isinstance(history, list):
        history = []
    today = forecast["sunset"]["date"]
    rec = {
        "date": today,
        "sunrise_vividness": forecast["sunrise"]["vividness"],
        "sunset_vividness": forecast["sunset"]["vividness"],
    }
    history = [h for h in history if h.get("date") != today]  # 去重
    history.append(rec)
    history.sort(key=lambda h: h.get("date", ""))
    history = history[-HISTORY_MAX:]
    save_json(HISTORY_PATH, history)
    log(f"history 已更新: {len(history)} 条")


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def main() -> int:
    os.makedirs(DATA_DIR, exist_ok=True)
    old = load_json(FORECAST_PATH, {}) or {}
    fail_count = int(old.get(FAIL_COUNT_KEY, 0) or 0)

    forecast: Optional[dict] = None
    source = ""
    try:
        if fail_count >= MAIN_FAIL_TOLERANCE:
            log(f"主源已连续失败 {fail_count} 次（≥{MAIN_FAIL_TOLERANCE}），本轮直接使用降级源")
            raise RuntimeError("跳过主源")
        res = fetch_sunsetbot()
        forecast = {"sunset": res["sunset"], "sunrise": res["sunrise"]}
        source = "sunsetbot"
        fail_count = 0
    except Exception as e:
        log(f"⚠ 主源失败: {e!r}")
        fail_count += 1
        if fail_count > MAIN_FAIL_TOLERANCE:
            fail_count = MAIN_FAIL_TOLERANCE
        # 降级链: Open-Meteo ECMWF IFS 0.25° → Open-Meteo 默认模型
        for model, src in (("ecmwf_ifs025", "open-meteo-ecmwf"), (None, "open-meteo")):
            try:
                forecast = fetch_openmeteo(model=model)
                source = src
                log(f"✓ 降级源 {src} 成功")
                break
            except Exception as e2:
                log(f"✗ 降级源 {src} 失败: {e2!r}")
        if forecast is None:
            if old.get("sunset") and old.get("sunrise"):
                forecast = old
                forecast["stale"] = True
                forecast["updated_at"] = now_iso()
                forecast[FAIL_COUNT_KEY] = fail_count
                save_json(FORECAST_PATH, forecast)
                log("已保留旧 JSON 并标记 stale=true（未静默失败）")
                return 0
            log("✗ 无旧数据可保留，任务失败")
            return 1

    assert forecast is not None
    forecast[FAIL_COUNT_KEY] = fail_count
    forecast.update(
        {
            "city": CITY,
            "updated_at": now_iso(),
            "source": source,
            "stale": False,
            "last_push_at": old.get("last_push_at"),  # 保留上次推送时间
        }
    )
    save_json(FORECAST_PATH, forecast)
    log(f"✓ forecast.json 已写入 (source={source}, fail_count={fail_count})")
    update_history(forecast)
    return 0


if __name__ == "__main__":
    sys.exit(main())
