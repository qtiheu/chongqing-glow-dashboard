#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PushPlus 微信推送器
===================

读取 data/forecast.json，将「今晚晚霞」和/或「次日朝霞」预报推送到用户微信
（PushPlus 公众号：http://www.pushplus.plus/send）。

用法:
    python pipeline/push.py                 # 默认推送晚霞+朝霞两条
    python pipeline/push.py --event sunset  # 只推晚霞
    python pipeline/push.py --event sunrise # 只推朝霞
    python pipeline/push.py --dry-run       # 只打印文案，不真正发送

环境变量:
    PUSHPLUS_TOKEN  必填。PushPlus token，从环境变量读取，绝不硬编码。
    PUSH_THRESHOLD  可选，默认 0.6。鲜艳度 ≥ 阈值时标题加【🔥值得出门】前缀。

行为:
    - 推送成功后回写 forecast.json 的 last_push_at
    - 推送失败自动重试 2 次
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests

# 统一 UTF-8 输出（Windows 控制台 GBK 下 emoji 日志会崩溃；CI 里也保持稳定）
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PUSHPLUS_URL = "http://www.pushplus.plus/send"
RETRIES = 2

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FORECAST_PATH = os.path.join(BASE_DIR, "data", "forecast.json")


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def now_iso() -> str:
    """北京时间 ISO 字符串（无论 runner 时区，统一 +08:00）。"""
    bj = datetime.now(timezone(timedelta(hours=8)))
    return bj.isoformat(timespec="seconds")


def aod_label(aod: Optional[float]) -> str:
    if aod is None:
        return "未知"
    if aod < 0.25:
        return "通透"
    if aod <= 0.45:
        return "一般"
    return "较差"


def advice_for(vividness: float) -> str:
    """结论文案：≥0.6 值得出门，0.4~0.6 可观望，<0.4 不用等。"""
    if vividness >= 0.6:
        return "值得出门，提前 40 分钟到位"
    if vividness >= 0.4:
        return "可观望，提前 30 分钟看天再定"
    return "不用等，安心休息"


def build_message(forecast: dict, event: str, threshold: float) -> tuple[str, str]:
    """构造 (title, content_html)。"""
    city = forecast.get("city", "重庆")
    item = forecast.get(event, {})
    vividness = float(item.get("vividness", 0) or 0)
    level = item.get("level", "")
    aod = item.get("aod")
    model_run = item.get("model_run", "未知")
    date = item.get("date", "")
    duration_minutes = item.get("duration_minutes")

    if event == "sunset":
        emoji, head, time_label, key = "🌇", "今晚晚霞", "日落", "sunset_time"
    else:
        emoji, head, time_label, key = "🌅", "明早早霞", "日出", "sunrise_time"
    event_time = item.get(key, "—")

    fire = "【🔥值得出门】" if vividness >= threshold else ""
    title = f"{fire}{emoji} {city}·{head}预报"

    # 持续时间展示：有值显示"约 X 分钟"，否则显示"—"
    if duration_minutes:
        duration_text = f"约 {int(duration_minutes)} 分钟"
    else:
        duration_text = "—"

    lines = [
        f"{emoji} {city}·{head}预报",
        f"鲜艳度 {vividness:.2f}（{level}）｜气溶胶 {aod if aod is None else round(aod, 2)}（{aod_label(aod)}）",
        f"{time_label} {event_time}｜预计持续 {duration_text}",
        f"数据：{model_run}",
        f"建议：{advice_for(vividness)}",
    ]
    content = "<br>".join(lines)
    if date:
        title = f"{title}（{date}）"
    return title, content


def send_push(token: str, title: str, content: str, dry_run: bool = False) -> bool:
    """调用 PushPlus 发送，失败重试 RETRIES 次。"""
    payload = {"token": token, "title": title, "content": content, "template": "html"}
    for attempt in range(RETRIES + 1):
        if dry_run:
            log(f"[dry-run] 将发送 title={title!r} content={content!r}")
            return True
        try:
            r = requests.post(PUSHPLUS_URL, data=payload, timeout=20)
            body = r.json() if r.headers.get("content-type", "").startswith("application/json") else r.text
            code = body.get("code") if isinstance(body, dict) else None
            if r.status_code == 200 and (code in (200, None)):
                log(f"  ✓ 推送成功 (attempt {attempt + 1})")
                return True
            log(f"  ⚠ 推送失败(第{attempt + 1}次): http={r.status_code} body={body}")
        except Exception as e:  # noqa: BLE001
            log(f"  ⚠ 推送异常(第{attempt + 1}次): {e!r}")
        if attempt < RETRIES:
            time.sleep(3)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="PushPlus 推送朝霞/晚霞预报")
    parser.add_argument("--event", choices=["sunset", "sunrise", "all"], default="all")
    parser.add_argument("--dry-run", action="store_true", help="只打印文案不发送")
    args = parser.parse_args()

    token = os.environ.get("PUSHPLUS_TOKEN", "").strip()
    if not args.dry_run and not token:
        log("✗ 环境变量 PUSHPLUS_TOKEN 未设置，拒绝推送（token 只从环境变量读取）")
        return 1
    try:
        threshold = float(os.environ.get("PUSH_THRESHOLD", "0.6"))
    except ValueError:
        threshold = 0.6

    forecast = {}
    try:
        with open(FORECAST_PATH, "r", encoding="utf-8") as f:
            forecast = json.load(f)
    except Exception as e:
        log(f"✗ 读取 {FORECAST_PATH} 失败: {e!r}")
        return 1

    events = ["sunset", "sunrise"] if args.event == "all" else [args.event]
    all_ok = True
    for ev in events:
        item = forecast.get(ev)
        if not item:
            log(f"⚠ forecast.json 缺少 {ev} 字段，跳过")
            all_ok = False
            continue
        title, content = build_message(forecast, ev, threshold)
        if send_push(token, title, content, dry_run=args.dry_run):
            if not args.dry_run:
                forecast["last_push_at"] = now_iso()
                log(f"  → last_push_at 已更新: {forecast['last_push_at']}")
        else:
            all_ok = False

    # 回写（dry-run 不修改 last_push_at）
    if not args.dry_run:
        try:
            with open(FORECAST_PATH, "w", encoding="utf-8") as f:
                json.dump(forecast, f, ensure_ascii=False, indent=2)
        except Exception as e:
            log(f"⚠ 回写 forecast.json 失败: {e!r}")

    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
