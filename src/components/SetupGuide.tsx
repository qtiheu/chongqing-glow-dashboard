import { KeyRound, Github, Lock, RefreshCcw } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DATA_BASE_URL, CITY } from "@/config";

interface StepProps {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}

function Step({ n, icon: Icon, title, children }: StepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold text-white">
          {n}
        </div>
        <div className="mt-1 w-px flex-1 bg-border/60" />
      </div>
      <div className="pb-7">
        <div className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4 text-orange-400" />
          {title}
        </div>
        <div className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SetupGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">自助搭建指南</CardTitle>
        <CardDescription>4 步把本看板接入你自己的 GitHub 仓库 + 微信推送</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          <Step n={1} icon={KeyRound} title="获取 PushPlus Token">
            <p>
              打开 <a className="text-orange-400 underline underline-offset-4 hover:text-orange-300" href="https://www.pushplus.plus/" target="_blank" rel="noreferrer">pushplus.plus</a>{" "}
              微信扫码登录，进入「一对一推送」页即可看到你的 token。
            </p>
          </Step>

          <Step n={2} icon={Github} title="新建公开 GitHub 仓库并上传文件">
            <p>新建公开仓库，把本项目的以下内容上传到仓库根目录：</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">pipeline/</code>{" "}
                （scraper.py、push.py、requirements.txt）
              </li>
              <li>
                <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">.github/workflows/daily.yml</code>
              </li>
              <li>
                <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">data/</code>{" "}
                （先放空的 forecast.json / history.json 占位）
              </li>
            </ul>
          </Step>

          <Step n={3} icon={Lock} title="配置 Secret：PUSHPLUS_TOKEN">
            <p>
              仓库 <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">Settings → Secrets and variables → Actions</code>{" "}
              添加 <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">PUSHPLUS_TOKEN</code>，值填第 1 步拿到的 token。
              推送阈值可在 <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">daily.yml</code> 顶部{" "}
              <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">PUSH_THRESHOLD</code> 环境变量中调整。
            </p>
          </Step>

          <Step n={4} icon={RefreshCcw} title="修改本站配置并手动触发一次验证">
            <p>
              把 <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">src/config.ts</code> 中的{" "}
              <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">DATA_BASE_URL</code> 替换为你的 raw 地址后重新构建部署本站；
              然后到仓库 <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">Actions</code> 页手动触发{" "}
              <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">Daily Forecast &amp; Push</code>，检查微信是否收到推送、
              <code className="rounded bg-secondary/60 px-1.5 py-0.5 text-xs">data/forecast.json</code> 是否已更新。
            </p>
            <p className="mt-2 rounded-lg border border-border/60 bg-secondary/25 px-3 py-2 text-xs">
              当前配置：CITY = {CITY}，数据地址 = <span className="break-all">{DATA_BASE_URL}</span>
              {DATA_BASE_URL.includes("YOUR_GITHUB_USER") && (
                <span className="mt-1 block text-amber-300">
                  ⚠ 尚未替换占位符，网站当前展示的是内置示例数据。
                </span>
              )}
            </p>
          </Step>
        </div>
      </CardContent>
    </Card>
  );
}
