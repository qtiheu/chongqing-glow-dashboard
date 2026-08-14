import { BellRing, Send, ShieldCheck } from "lucide-react";
import type { Forecast } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUpdated } from "@/lib/levels";
import { PUSH_THRESHOLD, PUSH_CHANNEL } from "@/config";

interface Props {
  forecast: Forecast;
  loading?: boolean;
}

export function PushStatusCard({ forecast, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const lastPush = forecast.last_push_at;
  const items = [
    {
      icon: Send,
      label: "最近一次推送",
      value: formatUpdated(lastPush),
      hint: lastPush ? "已回写 last_push_at" : "尚未推送过",
    },
    {
      icon: BellRing,
      label: "推送阈值",
      value: `鲜艳度 ≥ ${PUSH_THRESHOLD}`,
      hint: "达到阈值时标题加【🔥值得出门】",
    },
    {
      icon: ShieldCheck,
      label: "推送渠道",
      value: PUSH_CHANNEL,
      hint: "token 由环境变量注入，不入库",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">推送状态</CardTitle>
        <CardDescription>每日定时推送到微信 · GitHub Actions 驱动</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-xl border border-border/60 bg-secondary/25 p-4"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <it.icon className="h-3.5 w-3.5 text-orange-400" />
              {it.label}
            </div>
            <div className="tabular mt-2 text-lg font-semibold leading-tight">{it.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{it.hint}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
