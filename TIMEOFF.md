# AdLab 交接文档

更新时间：2026-11-06（Asia/Shanghai）

## 项目来源与代码位置

GitHub 仓库：

```text
https://github.com/crisfeng0309-ux/Ai-project
```

GitHub `main` 当前最新提交：

```text
381f79fe21f791fd209cf486122dce1fcc600d81
```

线上网站：

```text
https://adlab-five-indol.vercel.app
```

本地旧工作区：

```text
C:\Users\ni\Documents\Codex\2026-11-02\wx
```

注意：本地 `wx` 目录没有可用的本地提交记录，文件显示为未跟踪状态，而且不是 GitHub 当前最新版本。新 Agent 应优先重新克隆 GitHub `main`。

```bash
git clone https://github.com/crisfeng0309-ux/Ai-project.git
cd Ai-project
```

## 技术栈与启动方式

- 前端：原生 HTML、CSS、JavaScript
- 后端：Node.js ES Modules
- 部署：Vercel API Routes，也支持 `server.mjs` 本地运行
- 数据保存：浏览器 `localStorage`
- 页面路由：History API 和 hash 路由
- AI：DeepSeek、豆包/火山引擎方舟
- 不使用 React、Next.js 或数据库

Node.js 需要 20 或更高版本：

```bash
npm install
npm run dev
```

或：

```bash
npm start
```

默认地址：`http://localhost:4173`

## 目录结构

```text
index.html                  前端主页面和交互逻辑
server.mjs                  本地 Node.js 后端
api/                        Vercel API 路由
lib/                        AI、生图、货币和知识库逻辑
lib/knowledge/              四类广告设计知识库 JSON
assets/                     静态资源
package.json                启动命令
vercel.json                 Vercel 配置
.env.example                环境变量模板
```

主要 API：

```text
/api/product-understanding
/api/creative-strategy
/api/ad-assets
/api/data-analysis
/api/prompt-translations
/api/generate-image
/api/generate-image-task
/api/generate-image-status
```

## 当前功能状态

已完成并保留：

- 商品理解和信息可信度核查
- 卖点候选、选择、删除和重新生成
- 创意方向多选
- 核心受众生成、添加、删除、选择和保存
- 创意简报生成、修改、版本和确认
- 广告图片模板生成
- 广告图片提示词和视频提示词生成
- 中文翻译
- 目标市场和当地货币价格
- 广告数据分析路径
- DeepSeek 接口
- 豆包生图接口
- 广告设计知识库
- 项目保存、历史项目、localStorage、History API

## 当前生图流程

```text
提交豆包异步生图任务
→ 返回 taskId
→ 前端轮询任务状态
→ 获取图片地址
→ 显示最终图片
```

相关文件：

```text
lib/image-generation.mjs
api/generate-image-task.mjs
api/generate-image-status.mjs
```

如果豆包异步接口返回 400、404 或 405，前端会回退到原来的同步生图接口。

知识库相关文件：

```text
lib/design-knowledge.mjs
lib/image-prompt-rules.mjs
lib/knowledge/product_showcase.json
lib/knowledge/lifestyle_marketing.json
lib/knowledge/creative_concept.json
lib/knowledge/feature_benefit.json
```

知识库只辅助构图、色彩、光影、排版和产品展示，不应覆盖用户商品信息和创意简报。

## 环境变量

真实 API Key 不能提交到 GitHub，也不能写进前端。需要在 Vercel 或本地 `.env` 中配置：

```text
DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL
DEEPSEEK_MODEL
DEEPSEEK_VISION_MODEL
ARK_API_KEY
ARK_IMAGE_MODEL
ARK_IMAGE_API_URL
ARK_IMAGE_SIZE
ARK_IMAGE_TASK_API_URL
ARK_IMAGE_STATUS_API_URL
```

不要读取、输出或提交真实密钥。

## 数据与兼容性注意事项

- 项目历史保存在浏览器 `localStorage`，不是服务器数据库。
- 当前 localStorage key 是 `adlab-projects-v1`。
- 更换域名后，旧域名下的历史项目不会自动出现在新域名。
- 修改商品、卖点、创意方向、受众、目标市场或平台时，要保持指纹校验和旧 AI 结果失效逻辑。
- 不要把异步生图轮询改成阻塞式长请求。
- 不要删除同步生图兜底。

## 版本历史重点

```text
355e401  建立广告设计知识库并接入豆包生图
4960ef7  修复广告图片模板生成按钮卡顿
d226a9f  改用异步任务轮询生成广告图片
381f79f  兼容豆包任务状态返回格式（当前 main）
```

字体优化版本后来按用户要求回退了。当前版本保留知识库和生图稳定性/异步轮询相关改动，但不包含后来撤销的字体优化内容。

## 新 Agent 开始工作前必须检查

1. 从 GitHub `main` 重新读取代码。
2. 确认当前部署提交是否为 `381f79f` 或其后续提交。
3. 检查 Vercel 环境变量是否存在，但不要输出密钥。
4. 检查 `/api/generate-image-task` 和 `/api/generate-image-status` 是否已经部署。
5. 先运行语法检查和本地启动，再修改代码。
6. 修改前说明影响范围，确保不影响商品理解、创意策略、提示词分支和数据分析路径。
7. 不要使用旧的本地 `wx` 工作区覆盖 GitHub 最新代码。
