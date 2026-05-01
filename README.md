# llm-router

一个面向开发者工作流的开源多模型路由服务。

`llm-router` 位于多个大模型提供方之前，负责分析请求任务、选择更合适的模型，并提供统一的 OpenAI 风格接口、可选任务拆解能力，以及一个本地 Web 调试页，方便快速验证路由效果。

English version is provided below. Chinese is the primary version of this README.

---

## 中文

### 这个项目适合做什么

- 按任务类型把代码、分析、总结、通用请求分发给不同模型
- 给内部工具提供统一 API 入口，而不是在多个脚本里各自硬接 provider
- 在搭更大的 agent 平台前，先验证任务级路由逻辑
- 对比规则路由与 LLM 辅助路由在同一请求上的效果

### 当前技术栈

- 运行时：Node.js + TypeScript + Express
- 配置：`.env` + YAML 模型配置
- 当前已接入的 provider：
  - StepFun
  - Volcengine Ark
  - MiniMax

### 当前能力

- 任务分类与模型路由
- 可选的 LLM 驱动任务分析
- 可选的复杂任务拆解
- OpenAI 风格的 `/v1/chat/completions` 接口
- `/v1/models`、`/v1/route`、`/health` 等调试与服务端点
- 本地 Web 调试页面

### 项目状态

这个项目更像一个实战型开发者工具，而不是已经封装完整的云平台产品。

已经具备：

- 可运行的本地 API 服务
- provider registry 与 gateway 层
- 规则路由器
- 任务分析与拆解流程
- 本地测试页

仍然值得继续补强：

- 更稳的路由策略
- 更清晰的 provider 抽象
- 更完整的测试覆盖
- 更适合生产环境的部署与安全能力

### 快速开始

#### 环境要求

- Node.js 18+
- npm 或 pnpm

#### 安装

```bash
git clone https://github.com/kunpeng-ai-lab/llm-router.git
cd llm-router
npm install
```

#### 配置环境变量

```bash
cp .env.example .env
```

填入你实际要使用的 provider API Key：

```env
STEP_API_KEY=your_stepfun_api_key_here
ARK_API_KEY=your_ark_api_key_here
MINIMAX_API_KEY=your_minimax_api_key_here
PORT=3044
ENABLE_DEBUG_ENV=false
```

#### 启动服务

```bash
npm run dev
```

启动后可访问：

- 应用：`http://localhost:3044`
- 健康检查：`http://localhost:3044/health`
- 模型列表：`http://localhost:3044/v1/models`

### API 示例

#### 自动路由聊天

```bash
curl -X POST http://localhost:3044/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [
      { "role": "user", "content": "Write a Python quicksort function" }
    ]
  }'
```

#### 查看可用模型

```bash
curl http://localhost:3044/v1/models
```

#### 查看路由结果

```bash
curl -X POST http://localhost:3044/v1/route \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Explain dependency injection and compare it with service locator"
  }'
```

### 路由流程

当前路由大致分为 5 步：

1. 解析请求
2. 判断任务类型
3. 选择主模型
4. 对复杂任务做可选拆解
5. 执行并返回统一响应

当前支持两种路由模式：

- 规则路由
- LLM 辅助路由

其中规则路由是当前最稳定、也最方便审查的一条基线。

### 项目结构

```text
llm-router/
├─ public/
│  └─ index.html
├─ src/
│  ├─ api/
│  │  └─ server.ts
│  ├─ config/
│  │  ├─ loader.ts
│  │  └─ models.yaml
│  ├─ models/
│  │  └─ liteLLM_gateway.ts
│  ├─ router/
│  │  └─ rule_based_router.ts
│  ├─ synthesizer/
│  ├─ tasks/
│  └─ types/
├─ tests/
├─ .env.example
└─ README.md
```

### 安全说明

- 不要把真实 API Key 提交到仓库中
- `.env` 已被 Git 忽略
- `.env.example` 只能保留占位符
- `/debug/env` 仅适合本地调试，生产环境默认不应暴露
- 即使只返回 provider 是否已配置，也会暴露部分基础设施信息，所以仍应谨慎处理

### 下一步更值得补的方向

- 增加 provider 级别的 mock 集成测试
- 把更多路由规则迁到配置层，而不是全部硬编码
- 增加更清晰的日志与请求追踪
- 补充 VPS / 容器部署说明
- 如果要对公网开放，再补鉴权、限流和访问保护

### 贡献与反馈

欢迎分享、引用与改进。

- 发现问题：欢迎提 [Issue](https://github.com/kunpeng-ai-lab/llm-router/issues)
- 有改进建议：欢迎提 [Pull Request](https://github.com/kunpeng-ai-lab/llm-router/pulls)

### 相关链接

- 主站博客：https://kunpeng-ai.com
- GitHub 组织：https://github.com/kunpeng-ai-research
- OpenClaw 官方：https://openclaw.ai

### 维护与署名

- 维护者：鲲鹏AI探索局

### License

MIT

---

## English

An open-source multi-model routing service for developer workflows.

`llm-router` sits in front of multiple LLM providers, analyzes the incoming task, and routes the request to a more suitable model. It also exposes an OpenAI-compatible chat endpoint, optional task decomposition, and a lightweight local web console for manual testing.

### What It Is Good For

- Routing coding, analysis, summary, and general prompts to different model backends
- Giving internal tools a single API entry instead of hard-coding one provider everywhere
- Testing task-based routing logic before building a larger agent platform
- Comparing rule-based routing with LLM-assisted routing for the same prompt flow

### Current Stack

- Runtime: Node.js + TypeScript + Express
- Config: `.env` + YAML model config
- Current provider wiring:
  - StepFun
  - Volcengine Ark
  - MiniMax

### Main Capabilities

- Task classification and model routing
- Optional LLM-driven analysis path
- Optional task decomposition for more complex prompts
- OpenAI-style `/v1/chat/completions` endpoint
- `/v1/models`, `/v1/route`, and `/health` endpoints
- Local web dashboard for quick manual testing

### Project Status

This project is a practical developer tool, not a finished cloud platform.

What already exists:

- Runnable local API service
- Provider registry and gateway layer
- Rule-based router
- Task analyzer and decomposition flow
- Local test page

What is still evolving:

- Better routing heuristics
- Stronger provider abstraction
- More complete tests
- Production deployment hardening

### Quick Start

#### Requirements

- Node.js 18+
- npm or pnpm

#### Install

```bash
git clone https://github.com/kunpeng-ai-lab/llm-router.git
cd llm-router
npm install
```

#### Configure Environment Variables

```bash
cp .env.example .env
```

Fill in the providers you actually plan to use:

```env
STEP_API_KEY=your_stepfun_api_key_here
ARK_API_KEY=your_ark_api_key_here
MINIMAX_API_KEY=your_minimax_api_key_here
PORT=3044
ENABLE_DEBUG_ENV=false
```

#### Start the Server

```bash
npm run dev
```

Then open:

- App: `http://localhost:3044`
- Health: `http://localhost:3044/health`
- Models: `http://localhost:3044/v1/models`

### API Examples

#### Auto-Routed Chat

```bash
curl -X POST http://localhost:3044/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [
      { "role": "user", "content": "Write a Python quicksort function" }
    ]
  }'
```

#### List Available Models

```bash
curl http://localhost:3044/v1/models
```

#### Inspect Routing Result

```bash
curl -X POST http://localhost:3044/v1/route \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Explain dependency injection and compare it with service locator"
  }'
```

### How Routing Works

Current routing happens in layers:

1. Parse the incoming prompt
2. Classify task type
3. Pick a primary model
4. Optionally decompose complex tasks
5. Execute and return a unified response

There are two routing modes:

- Rule-based routing
- LLM-assisted routing

The rule-based path is the current baseline and the easiest one to audit.

### Project Structure

```text
llm-router/
├─ public/
│  └─ index.html
├─ src/
│  ├─ api/
│  │  └─ server.ts
│  ├─ config/
│  │  ├─ loader.ts
│  │  └─ models.yaml
│  ├─ models/
│  │  └─ liteLLM_gateway.ts
│  ├─ router/
│  │  └─ rule_based_router.ts
│  ├─ synthesizer/
│  ├─ tasks/
│  └─ types/
├─ tests/
├─ .env.example
└─ README.md
```

### Security Notes

- No real API keys should ever be committed into this repository
- `.env` is intentionally ignored by Git
- `.env.example` must only contain placeholders
- `/debug/env` is intended for local debugging and should stay disabled in production unless explicitly enabled
- Even provider status visibility reveals some infrastructure choices, so handle it carefully

### Suggested Next Improvements

- Add provider-level integration tests with mocked responses
- Move routing rules into config instead of hard-coding all logic
- Add stronger logging and request tracing
- Add deployment instructions for a small VPS or container runtime
- Add rate limiting and auth if you plan to expose the API publicly

### Contributions And Feedback

- Found an issue? Open an [Issue](https://github.com/kunpeng-ai-lab/llm-router/issues)
- Have an improvement idea? Open a [Pull Request](https://github.com/kunpeng-ai-lab/llm-router/pulls)

### Related Links

- Main site: https://kunpeng-ai.com
- GitHub org: https://github.com/kunpeng-ai-research
- OpenClaw official site: https://openclaw.ai

### Maintained By

- 鲲鹏AI探索局

### License

MIT
