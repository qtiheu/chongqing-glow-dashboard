# 重庆 · 朝霞晚霞指数看板

展示重庆每日朝霞 / 晚霞鲜艳度（火烧云）预报的静态网站 + 每日 PushPlus 微信推送数据管道。

- **网站**：纯前端静态站点，运行时从本仓库 `data/` 下的 raw JSON 读取最新数据
- **数据管道**：GitHub Actions 每日定时抓取预报 → 写入 `data/forecast.json` / `data/history.json` → PushPlus 推送微信

## 目录结构

```
├─ .github/workflows/daily.yml   定时任务（每天北京 15:35 推晚霞、21:35 推朝霞 + 手动触发）
├─ pipeline/
│  ├─ scraper.py                 抓取数据（sunsetbot.top 主源 → Open-Meteo 降级）
│  ├─ push.py                    PushPlus 微信推送
│  └─ requirements.txt           仅 requests
├─ data/
│  ├─ forecast.json              最新预报（首次运行 Actions 后自动生成）
│  └─ history.json               近 30 天历史
└─ src/                          网站源码（React + TypeScript + Vite + Tailwind + shadcn/ui）
```

## 数据源

| 优先级 | 数据源 | 说明 |
|---|---|---|
| 主源 | [sunsetbot.top](https://sunsetbot.top) | ECMWF/GFS 云况 + CAMS 气溶胶，鲜艳度 0~2.5，气溶胶 AOD |
| 降级 | Open-Meteo | 免费 API（无需 key），云况 + CAMS AOD 简化评分模型 |

主源连续失败 2 次后自动切换降级源，JSON 的 `source` 字段标注实际来源；全部失败时保留旧数据并标记 `stale: true`。

## 等级映射

| 鲜艳度 | 等级 |
|---|---|
| ≥ 0.8 | 大烧 |
| 0.6 ~ 0.8 | 中烧 |
| 0.4 ~ 0.6 | 小烧 |
| 0.2 ~ 0.4 | 微烧 |
| < 0.2 | 不烧 |

结论：≥ 0.6 值得出门 · 0.4~0.6 可观望 · < 0.4 不用等（阈值可在 `daily.yml` 的 `PUSH_THRESHOLD` 调整）。

## 部署：4 步接入你自己的 GitHub 仓库 + 微信推送

### ① 获取 PushPlus Token
打开 [pushplus.plus](https://www.pushplus.plus/) 微信扫码登录，进入「一对一推送」页复制你的 token。

### ② 新建公开仓库并上传文件
新建 **公开** GitHub 仓库，把本项目的以下内容放到仓库根目录：

- `pipeline/`（scraper.py、push.py、requirements.txt）
- `.github/workflows/daily.yml`
- `data/`（先放空的 forecast.json / history.json 占位，仓库里已带）

### ③ 配置 Secret
仓库 `Settings → Secrets and variables → Actions` 添加：

| Name | Value |
|---|---|
| `PUSHPLUS_TOKEN` | 第 ① 步拿到的 token |

> 注意：默认分支需要是 `main`（workflow 里 `git push` 基于它）。如用 `master`，请同步修改 `daily.yml` 的 push 逻辑。

### ④ 修改网站配置并验证
1. 改 `src/config.ts`：把 `DATA_BASE_URL` 的 `YOUR_GITHUB_USER/YOUR_REPO` 替换为你的用户名 / 仓库名；
2. 重新构建部署网站（`npm install && npm run build`，产出 `dist/`）；
3. 到仓库 `Actions` 页手动触发 **Daily Forecast & Push**（`workflow_dispatch`），
   检查微信是否收到推送、`data/forecast.json` 是否已更新。

之后每天自动运行：

- **UTC 07:35（北京 15:35）**：抓取数据 + 推送当晚晚霞
- **UTC 13:35（北京 21:35）**：抓取数据 + 推送次日朝霞

## 本地开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 构建到 dist/
```

## 数据 Schema

`data/forecast.json`：

```json
{
  "city": "重庆",
  "updated_at": "2026-08-14T15:35:00+08:00",
  "source": "sunsetbot",
  "stale": false,
  "last_push_at": "2026-08-14T15:35:12+08:00",
  "sunset": { "date": "2026-08-14", "vividness": 0.83, "level": "大烧", "aod": 0.21, "sunset_time": "19:42", "model_run": "EC 凌晨时次 (2026081312z)" },
  "sunrise": { "date": "2026-08-15", "vividness": 0.35, "level": "微烧", "aod": 0.30, "sunrise_time": "06:28", "model_run": "GFS 傍晚时次 (2026081406z)" }
}
```

`data/history.json`：数组，每日一条 `{ "date", "sunrise_vividness", "sunset_vividness" }`，只保留近 30 天。

## 免责声明

预报基于数值模式（ECMWF/GFS/CAMS 或 Open-Meteo），仅供参考，实际以天空为准。
