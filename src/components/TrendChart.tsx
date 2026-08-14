import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import type { HistoryRecord } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PUSH_THRESHOLD } from "@/config";

interface Props {
  history: HistoryRecord[];
  loading?: boolean;
}

function shortDate(d: string): string {
  return d.slice(5); // MM-DD
}

export function TrendChart({ history, loading }: Props) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  const data = history
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: shortDate(r.date),
      full: r.date,
      朝霞: r.sunrise_vividness,
      晚霞: r.sunset_vividness,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          近 30 天趋势
          <span className="rounded-md bg-secondary/60 px-2 py-0.5 text-xs font-normal text-muted-foreground">
            朝霞 / 晚霞鲜艳度
          </span>
        </CardTitle>
        <CardDescription>双折线对比，虚线为 {PUSH_THRESHOLD} 阈值参考线</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -14 }}>
              <CartesianGrid stroke="hsl(217 22% 22%)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(35 12% 64%)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(217 22% 22%)" }}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                domain={[0, 2.5]}
                tick={{ fill: "hsl(35 12% 64%)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(222 40% 11%)",
                  border: "1px solid hsl(217 22% 22%)",
                  borderRadius: 12,
                  color: "hsl(40 33% 96%)",
                  fontSize: 12,
                }}
                labelFormatter={(label) => `日期 ${label}`}
                formatter={(value, name) => [`${Number(value).toFixed(2)}`, String(name)]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(value) => <span style={{ color: "hsl(40 33% 90%)" }}>{value}</span>}
              />
              <ReferenceLine
                y={PUSH_THRESHOLD}
                stroke="hsl(16 92% 60%)"
                strokeDasharray="6 4"
                strokeOpacity={0.7}
                label={{
                  value: `阈值 ${PUSH_THRESHOLD}`,
                  position: "insideTopRight",
                  fill: "hsl(16 92% 60%)",
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="朝霞"
                stroke="#fb923c"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="晚霞"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
