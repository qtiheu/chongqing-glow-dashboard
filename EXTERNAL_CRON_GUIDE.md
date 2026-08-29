# 外部定时触发配置（cron-job.org 兜底方案）

> GitHub Actions 的 schedule 在 2026-08-27 起出现异常（触发时间偏移约 12 小时、新 cron 不生效），
> 此方案用云端定时服务每天调用 GitHub `workflow_dispatch` API 触发任务，绕开 GitHub schedule。

## 已就绪的部分（已完成 ✅）

- `daily.yml` 已支持 `workflow_dispatch` 输入参数 `event`（sunset / sunrise / all）
- 外部触发链路已验证：run 32（event=sunset）只推送晚霞、朝霞步骤跳过，数据提交正常
- 仓库地址：`qtiheu/chongqing-glow-dashboard`

## 你需要做的（2 步）

### 第 1 步：生成最小权限 GitHub Token

1. 打开 https://github.com/settings/personal-access-tokens/new
2. Repository access → **Only select repositories** → 勾选 `chongqing-glow-dashboard`
3. Permissions → **Actions** → **Read and write**（其余全部 No access）
4. Generate token，复制 `github_pat_` 开头的 token（只给 cron-job.org 用）

### 第 2 步：在 cron-job.org 创建两个定时任务

注册并登录 https://cron-job.org 后，创建两个 job：

#### 任务 A：每天 15:35 推送「当晚晚霞」

| 配置项 | 值 |
|---|---|
| **Title** | 重庆晚霞推送 15:35 |
| **Schedule** | `35 15 * * *`（时区选 **Asia/Shanghai**）|
| **Method** | POST |
| **URL** | `https://api.github.com/repos/qtiheu/chongqing-glow-dashboard/actions/workflows/daily.yml/dispatches` |
| **Header 1** | `Authorization: Bearer <你的最小权限token>` |
| **Header 2** | `Accept: application/vnd.github+json` |
| **Header 3** | `Content-Type: application/json` |
| **Body** | `{"ref":"main","inputs":{"event":"sunset"}}` |

#### 任务 B：每天 21:35 推送「次日朝霞」

| 配置项 | 值 |
|---|---|
| **Title** | 重庆朝霞推送 21:35 |
| **Schedule** | `35 21 * * *`（时区选 **Asia/Shanghai**）|
| **Method** | POST |
| **URL** | `https://api.github.com/repos/qtiheu/chongqing-glow-dashboard/actions/workflows/daily.yml/dispatches` |
| **Header 1** | `Authorization: Bearer <你的最小权限token>` |
| **Header 2** | `Accept: application/vnd.github+json` |
| **Header 3** | `Content-Type: application/json` |
| **Body** | `{"ref":"main","inputs":{"event":"sunrise"}}` |

> cron-job.org 免费版限制：最多 2 个 job、最小间隔 5 分钟——本方案每天各 1 次，完全够用。
> 时区务必选 Asia/Shanghai（北京时间），这样 `35 15` 就是下午 3:35。

## 验证方式

配置保存后，cron-job.org 的 job 详情页有 **Run now / Test** 按钮，可立即执行一次测试；
或在仓库 Actions 页面看到新 run（event=workflow_dispatch），确认推送步骤按预期执行。
