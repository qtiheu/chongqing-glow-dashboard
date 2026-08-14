/**
 * 全局配置：数据源仓库地址在这里修改。
 *
 * 把你的 GitHub 用户名和仓库名填进去（公开仓库，包含 data/forecast.json 与 data/history.json）：
 *   export const DATA_BASE_URL = "https://raw.githubusercontent.com/<你的用户名>/<仓库名>/main/data";
 *
 * 未替换时网站会展示内置示例数据，并提示按「自助搭建指南」接入。
 */
export const CITY = "重庆";

export const DATA_BASE_URL =
  "https://raw.githubusercontent.com/qtiheu/chongqing-glow-dashboard/main/data";

/** 推送阈值（与 pipeline/.github/workflows/daily.yml 的 PUSH_THRESHOLD 保持一致） */
export const PUSH_THRESHOLD = 0.6;

/** 推送渠道 */
export const PUSH_CHANNEL = "PushPlus（微信）";

export const FORECAST_URL = `${DATA_BASE_URL}/forecast.json`;
export const HISTORY_URL = `${DATA_BASE_URL}/history.json`;

export const IS_PLACEHOLDER = DATA_BASE_URL.includes("YOUR_GITHUB_USER");
