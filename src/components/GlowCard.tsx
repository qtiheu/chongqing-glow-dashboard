import { Sun, Sunrise, Sunset, CloudFog } from "lucide-react";
import type { GlowEvent } from "@/lib/types";
import { levelMeta, verdictOf, aodLabel } from "@/lib/levels";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  kind: "sunset" | "sunrise";
  event?: GlowEvent;
  loading?: boolean;
}

const VERDICT_STYLE: Record<string, string> = {
  值得出门: "text-red-300",
  可观望: "text-amber-300",
  不用等: "text-zinc-400",
};

export function GlowCard({ kind, event, loading }: Props) {
  const isSunset = kind === "sunset";
  const title = isSunset ? "今晚晚霞" : "明早早霞";
  const desc = isSunset ? "Today Sunset Glow" : "Tomorrow Sunrise Glow";
  const Icon = isSunset ? Sunset : Sunrise;
  const timeLabel = isSunset ? "日落" : "日出";

  if (loading || !event) {
    return (
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const meta = levelMeta(event.level);
  const verdict = verdictOf(event.vividness);
  const aod = event.aod;
  const time = isSunset ? event.sunset_time : event.sunrise_time;

  return (
    <Card className="group relative overflow-hidden">
      {/* 顶部暖色渐变光带 */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r",
          kind === "sunset" ? "from-red-600 via-orange-500 to-amber-400" : "from-rose-500 via-fuchsia-500 to-sky-400"
        )}
      />
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg",
                kind === "sunset" ? "bg-orange-500/15 text-orange-400" : "bg-rose-500/15 text-rose-300"
              )}
            >
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-xl">{title}</CardTitle>
              <CardDescription className="font-light">{desc}</CardDescription>
            </div>
          </div>
          <Badge className={cn("px-3 py-1 text-sm", meta.badge)}>{event.level}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* 超大号鲜艳度数值 */}
        <div className="flex items-end gap-3">
          <span className={cn("tabular text-7xl font-bold leading-none tracking-tight sm:text-8xl", meta.color)}>
            {event.vividness.toFixed(2)}
          </span>
          <div className="pb-1.5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">鲜艳度</div>
            <div className="text-sm text-muted-foreground">0 ~ 2.5</div>
          </div>
        </div>

        {/* 结论 */}
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-4 py-1.5 text-sm font-medium",
            VERDICT_STYLE[verdict]
          )}
        >
          <Sun className="h-4 w-4" />
          {verdict}
          {event.vividness >= 0.6 && <span className="text-xs opacity-80">提前 40 分钟到位</span>}
        </div>

        {/* 详情网格 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border/50 pt-4 text-sm sm:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground">气溶胶 AOD</div>
            <div className="mt-0.5 flex items-center gap-1.5 font-medium">
              {aod != null ? (
                <>
                  <span className="tabular">{aod.toFixed(2)}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px]",
                      aodLabel(aod) === "通透" && "bg-emerald-500/15 text-emerald-300",
                      aodLabel(aod) === "一般" && "bg-amber-500/15 text-amber-300",
                      aodLabel(aod) === "较差" && "bg-zinc-500/20 text-zinc-400"
                    )}
                  >
                    {aodLabel(aod)}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">未知</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{timeLabel}时间</div>
            <div className="tabular mt-0.5 font-medium">{time ?? "—"}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground">预报模型 · 时次</div>
            <div className="mt-0.5 flex items-center gap-1.5 font-medium">
              <CloudFog className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="truncate">{event.model_run || "—"}</span>
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground">预报日期</div>
            <div className="tabular mt-0.5 font-medium">{event.date}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
