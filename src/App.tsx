import { AlertTriangle, RefreshCw, Database, Info } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { GlowCard } from "@/components/GlowCard";
import { TrendChart } from "@/components/TrendChart";
import { LevelGuide } from "@/components/LevelGuide";
import { PushStatusCard } from "@/components/PushStatusCard";
import { SetupGuide } from "@/components/SetupGuide";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { sourceLabel, formatUpdated } from "@/lib/levels";
import { CITY } from "@/config";

export default function App() {
  const { forecast, history, loading, usingSample, stale, error, refresh } = useDashboardData();

  return (
    <div className="min-h-screen">
      <div className="container py-6 sm:py-10">
        {/* 顶部栏 */}
        <header className="animate-fade-in mb-8 flex flex-col gap-4 sm:mb-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-red-500 bg-clip-text text-transparent">
                  {CITY} · 朝霞晚霞指数
                </span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                火烧云鲜艳度定量预报 · 数据每日自动更新
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                刷新
              </Button>
            </div>
          </div>

          {/* 元信息行 */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-orange-400" />
              数据更新：
              <span className="tabular text-foreground/80">{formatUpdated(forecast.updated_at)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-orange-400" />
              数据来源：
              <span className="text-foreground/80">{sourceLabel(forecast.source)}</span>
            </span>
            {usingSample && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-amber-300">
                示例数据 · 请按下方指南接入真实数据
              </span>
            )}
          </div>
        </header>

        {/* 过期 / 失败提示条 */}
        {(stale || error) && !usingSample && (
          <Alert variant="warning" className="animate-fade-in mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>数据可能不是最新</AlertTitle>
            <AlertDescription>
              {error
                ? "实时数据获取失败，当前展示的是缓存或示例内容。"
                : "上游标记了 stale=true（抓取失败保留了旧数据），请检查 GitHub Actions 运行日志。"}
            </AlertDescription>
          </Alert>
        )}
        {usingSample && (
          <Alert variant="warning" className="animate-fade-in mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>当前为内置示例数据</AlertTitle>
            <AlertDescription>
              <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">src/config.ts</code>{" "}
              中的仓库地址仍是占位符（YOUR_GITHUB_USER/YOUR_REPO），或数据尚未生成。完成下方 4 步搭建后即可看到真实预报。
            </AlertDescription>
          </Alert>
        )}

        {/* 主卡片 × 2 */}
        <main className="animate-fade-in grid gap-5 lg:grid-cols-2" style={{ animationDelay: "80ms" }}>
          <GlowCard kind="sunset" event={forecast.sunset} loading={loading} />
          <GlowCard kind="sunrise" event={forecast.sunrise} loading={loading} />
        </main>

        {/* 趋势图 + 推送状态 */}
        <div className="animate-fade-in mt-5 grid gap-5" style={{ animationDelay: "160ms" }}>
          <TrendChart history={history} loading={loading} />
        </div>
        <div className="animate-fade-in mt-5" style={{ animationDelay: "220ms" }}>
          <PushStatusCard forecast={forecast} loading={loading} />
        </div>

        {/* 科普 + 指南 */}
        <div className="animate-fade-in mt-5 grid gap-5 lg:grid-cols-2" style={{ animationDelay: "280ms" }}>
          <LevelGuide />
          <SetupGuide />
        </div>

        <footer className="mt-12 border-t border-border/50 pt-6 pb-4 text-center text-xs text-muted-foreground">
          <p>
            {CITY} · 朝霞晚霞指数看板 — 数据来源：SunsetBot / Open-Meteo，仅供参考，实际以天空为准。
          </p>
          <p className="mt-1">
            推送服务：PushPlus（微信） · 阈值 0.6 起标题加【🔥值得出门】
          </p>
        </footer>
      </div>
    </div>
  );
}
