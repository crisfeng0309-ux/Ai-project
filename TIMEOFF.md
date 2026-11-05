# AdLab 交接文档（TIMEOFF）

- 更新时间：2026-11-06
- 核对基线：`main` = `a11c763`（本文档所有陈述都经过实际执行验证，未验证的会明确标注）
- 上一手开发：Codex 对话式开发；本版由接手方核对后重写

---

## 1. 唯一可信代码来源

```text
https://github.com/crisfeng0309-ux/Ai-project
```

`main` 最近提交（新 → 旧）：

```text
a11c763  本地服务复用 lib/ai.mjs，消除与线上重复的后端实现   ← 当前 main
381f79f  兼容豆包任务状态返回格式
ced1cdc  兼容异步接口失败时的同步兜底      ← 注意：该兜底实际不生效，见第 5 节
d226a9f  改用异步任务轮询生成广告图片
4960ef7  修复广告图片模板生成按钮卡顿
abacdde  延长豆包生图等待时间
f346041  恢复到字体优化前版本              ← 字体优化已回退，当前不含
355e401  建立广告设计知识库并接入豆包生图
```

### 旧本地工作区不要用

```text
C:\Users\ni\Documents\Codex\2026-11-02\wx
C:\Users\ni\Documents\Codex\2026-11-02\wx-push
```

- `wx` 有 `.git` 但**零提交**，所有文件处于未跟踪状态
- 内容比仓库旧（`index.html` 251KB vs 仓库 255KB）
- `wx-push` 是当时为了绕开索引权限问题临时克隆出来的推送副本
- 两个目录里各有一份 `TIMEOFF.md`（内容不同，均未入库）。本文档是它的修正入库版

### 本机网络限制（会持续影响开发）

| 目标 | 状态 |
|---|---|
| `github.com:443` | ❌ TCP 超时，`git clone` / `git push` 走不通 |
| `api.github.com:443` | ✅ 通，`gh` 命令正常 |
| `ssh.github.com:443` / `github.com:22` | ✅ 通（但本机无 SSH key） |

因此推送要两条路二选一：

- 用 GitHub API 构造 blob → tree → commit → 更新 ref（已验证可行，本文档就是这么推的）
- 或配好 SSH key 走 `ssh.github.com:443`

另外两个坑：

- `git clone` 首次会报 `schannel: SEC_E_NO_CREDENTIALS`，需加 `-c http.sslBackend=openssl`
- PowerShell 5.1 把 `-d '{"a":"b"}'` 传给 curl 时会剥掉内层双引号，导致 JSON 解析失败。**测接口用 Node 的 fetch，不要用 PowerShell 调 curl 传 JSON**

---

## 2. 技术栈与启动方式

- 前端：原生 HTML + CSS + JavaScript，**单文件** `index.html`（约 2618 行）
- 后端：Node.js ES Modules，`server.mjs` 用 `node:http` 手写
- 部署：Vercel API Routes（`api/*.mjs`）
- 持久化：浏览器 `localStorage`，key 为 `adlab-projects-v1`
- 路由：History API + hash 路由
- AI：DeepSeek（文本）+ 豆包/火山方舟 ARK（生图）
- **零依赖**：`package.json` 没有任何 dependencies，`npm install` 是空操作

启动：

```bash
npm install     # 空操作
npm run dev     # 实际执行 node --env-file=.env server.mjs
```

默认地址 `http://localhost:4173`，可用 `PORT` 覆盖。

⚠️ 本机**没有安装 Node.js**（`node` / `npm` / `pnpm` 均查不到）。需要先装 Node 20+，或使用运行环境自带的 Node。

---

## 3. 目录结构与接口

```text
index.html                  前端全部交互逻辑
server.mjs                  本地 Node 后端（复用 lib/，与 api/ 同一套业务代码）
api/                        8 个 Vercel Serverless 函数
lib/ai.mjs                  DeepSeek 调用 + 六类结果归一化
lib/image-generation.mjs    豆包生图（同步 + 异步任务）
lib/image-prompt-rules.mjs  生图提示词规则（比例/透视/市场氛围）
lib/design-knowledge.mjs    广告设计知识库匹配器
lib/knowledge/*.json        四类广告知识库
lib/currency.mjs            人民币 → 当地货币换算
assets/adlab-mountain.jpg   首页背景图（约 1.3MB）
.env.example                环境变量模板
.vercelignore               排除 server.mjs / render.yaml / .env
```

八个接口：

```text
/api/product-understanding    商品理解、卖点提炼
/api/creative-strategy        创意方向、受众、创意简报
/api/ad-assets                广告素材方案（image / prompt 两种模式）
/api/prompt-translations      提示词中文翻译
/api/data-analysis            投放数据分析
/api/generate-image           豆包生图（同步）
/api/generate-image-task      豆包生图（异步建任务）
/api/generate-image-status    豆包生图（轮询状态）
```

统一响应信封：`{ ok: true, data }` 或 `{ ok: false, code, message }`。

---

## 4. 已完成功能

- 商品理解 + 信息可信度核查（`confirmed` / `inferred` / `needs_confirmation`）
- 卖点候选、选择、删除、再生成
- 创意方向多选、核心受众编辑
- 创意简报生成、修改、版本、确认
- 环节 3 二选一分流：**生成图片素材** / **生成广告提示词**
- 图片素材：多模板方案 → 选定模板 → 调豆包生图
- 提示词素材：三套方案，每套含图片提示词 + 视频提示词 + 中文翻译，可单套提修改建议再生成
- 人民币 → 目标市场当地货币（后端换算，汇率可配）
- 广告设计知识库（四类，按创意内容匹配单类注入）
- 广告数据分析路径（独立分支）
- localStorage 历史项目 + 指纹失效机制

---

## 5. 生图流程（含一处已确认的缺陷）

### 三条路由返回什么

| 路由 | 返回 |
|---|---|
| `/api/generate-image-task` | `taskId`（正常），若方舟同步回图则 `imageUrl` |
| `/api/generate-image-status` | `status` + `imageUrl` |
| `/api/generate-image` | `imageUrl` |

### 前端时序

```text
POST /api/generate-image-task        (客户端 20s / 服务端 15s / maxDuration 30)
  ├─ 有 imageUrl → 直接用
  ├─ 有 taskId   → 每 3s 轮询 /api/generate-image-status，总上限 180s
  └─ 抛错        → 命中兜底白名单才降级到 POST /api/generate-image (58s / 55s / 60)
```

### ⚠️ 同步兜底是死代码，永远不会触发

`index.html:2436` 用**精确等值**比较错误码：

```js
['AI_HTTP_400', 'AI_HTTP_404', 'AI_HTTP_405',
 'IMAGE_API_HTTP_400', 'IMAGE_API_HTTP_404', 'IMAGE_API_HTTP_405'].includes(taskError.code)
```

但后端抛出的 code 带 detail 后缀（`lib/image-generation.mjs:189`）：

```js
throw new Error(`IMAGE_API_HTTP_${response.status}: ${detail}`);
```

实测（把服务指向一个永远返回 404 的假方舟）：

```text
HTTP 502
code = "IMAGE_API_HTTP_404: endpoint not found (simulated)"
白名单命中 = false  → 不回退，直接抛错给用户
```

另外 `callAI` 超时抛的是**不带 code 的纯 Error**（`index.html:1494`），同样不命中。

**结论**：`ced1cdc`「兼容异步接口失败时的同步兜底」这个意图从未生效。异步接口 404/400/405 和提交超时两种最需要兜底的场景都会直接失败。

修复方向（未实施，需确认）：`index.html:2436` 改前缀匹配 `code.startsWith('IMAGE_API_HTTP_404')`，并让超时分支带上可识别 code。

---

## 6. 已知问题（按优先级）

| # | 问题 | 位置 | 状态 |
|---|---|---|---|
| 1 | 同步兜底死代码 | `index.html:2436` | 未修，1–3 行可改 |
| 2 | `DEEPSEEK_VISION_MODEL` 未配时，商品图会被发给主文本模型 | `lib/ai.mjs:205-208` | 已确认请求结构，是否被 API 拒绝需真实 Key 验证 |
| 3 | 整个 `projectState` 含 base64 商品图塞 localStorage，易触 5MB 配额 | `index.html` | 未修 |
| 4 | 前端存在死 HTML 与 10 个 `install*` retrofit 补丁，`#exportBtn`/`#continueBtn` 绑定已失效 | `index.html:554-574` 等 | 未修 |
| 5 | `*.vercel.app` 国内被 DNS 投毒 + SNI 阻断，评委可能打不开 | 部署层 | 需绑自有域名 |
| 6 | 本机未装 Node.js，`npm run dev` 跑不起来 | 环境 | 需安装 |

---

## 7. 环境变量

真实 Key 只放服务端（Vercel 环境变量或本地 `.env`），**不得写进前端、不得提交仓库**。

```text
DEEPSEEK_API_KEY          必填
DEEPSEEK_BASE_URL         https://api.deepseek.com
DEEPSEEK_MODEL            deepseek-chat
DEEPSEEK_VISION_MODEL     建议填（支持视觉输入的模型），否则商品图走主模型
ARK_API_KEY               必填（豆包生图）
ARK_IMAGE_MODEL           必填，方舟推理接入点 ID（ep- 开头），不是模型名
ARK_IMAGE_API_URL         https://ark.cn-beijing.volces.com/api/v3/images/generations
ARK_IMAGE_SIZE            1024x1024
ARK_IMAGE_TASK_API_URL    可选，异步任务端点
ARK_IMAGE_STATUS_API_URL  可选，任务状态端点
ARK_IMAGE_TIMEOUT_MS      默认 55000（上限 55000）
ADLAB_CNY_RATES           可选 JSON，如 {"THB":4.65,"VND":3500}
PORT                      本地默认 4173
```

零成本判断线上豆包是否配置好（不消耗额度）：`POST /api/generate-image-status` 带 `{}`

```text
503 IMAGE_API_NOT_CONFIGURED  → 没配 ARK_API_KEY 或 ARK_IMAGE_MODEL
400 IMAGE_TASK_ID_REQUIRED    → 配置齐全
```

---

## 8. 修改约束（红线）

- 不要重写项目；不要把 `index.html` 拆框架，不要引入 React / Next.js
- 不要删除广告数据分析路径
- 不要改变 DeepSeek 接口的调用方式（endpoint / 模型 / `temperature: 0.2` / `response_format: json_object`）
- 不要删除商品理解、创意策略、提示词生成、广告素材任一功能
- 不要把 API Key 写进前端，不要提交 `.env`
- 不要把 `server.mjs` 和 `lib/ai.mjs` 重新拆成两套实现（`a11c763` 刚合并完）
- 知识库只辅助构图/色彩/光影/排版，不得覆盖用户商品信息与创意简报
- 保留指纹校验：商品、卖点、创意方向、受众、市场、平台、简报、汇率任一变化时旧素材失效

---

## 9. 开工前检查清单

| # | 检查项 | 方法 | 当前结论 |
|---|---|---|---|
| 1 | GitHub main 是否最新 | `gh api .../git/ref/heads/main` | `a11c763`（比旧文档记的 `381f79f` 多 1 个提交） |
| 2 | Vercel 是否部署最新提交 | Vercel 后台 / token；本机因 SNI 阻断无法验证 | **待确认**。注意 `server.mjs` 被 `.vercelignore` 排除，`381f79f` 与 `a11c763` 的部署产物相同 |
| 3 | API 环境变量是否配置 | 上面那个零成本探测 | **待确认**（线上不可达）；本地 `.env` 关键项为空 |
| 4 | 生图返回 URL 还是 taskId | 读代码 + mock 实测 | 异步返 `taskId`、同步返 `imageUrl`，代码两者都兼容 |
| 5 | 是否影响其他功能 | 逐条比对第 8 节红线 | `a11c763` 仅改 `server.mjs`，不涉 `index.html` / `api/` / `lib/` |

---

## 10. 建议的下一步

1. **修同步兜底**（`index.html:2436`，1–3 行，低风险）
2. 确认 Vercel 部署版本与线上 `index.html` 是否等于仓库 HEAD
3. 填本地 `.env`，端到端跑通一次真实链路（商品图 → 素材 → 生图）
4. 绑自有域名，解决国内评委访问
5. 清理 `index.html` 死代码与失效绑定
