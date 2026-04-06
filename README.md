# MOP - Multi-Model Orchestration Platform

大模型智能路由聚合平台 - 一个基于任务类型自动选择最合适大模型的智能路由系统。

[English](#english) | [中文](#中文)

---

## 🎯 项目简介

MOP (Multi-Model Orchestration Platform) 是一个智能的大模型路由平台，能够根据用户请求的内容自动分析任务类型，并调度最合适的模型进行处理。

### 核心特性

- **🎯 智能路由** - 根据任务类型（代码/分析/创意等）自动选择最佳模型
- **🔄 多模型聚合** - 统一接口调用多个大模型服务
- **⚡ 任务拆解** - 复杂任务自动分解并行处理
- **💰 成本优化** - 按需调度，避免大模型小用
- **📊 消耗统计** - 实时统计各模型 Token 消耗
- **⭐ 多模型评分** - 支持多模型对比评分

---

## 🔧 支持的模型

| 模型 | 提供商 | 特点 | 适用场景 |
|------|--------|------|----------|
| **stepfun** | 阶跃星辰 | step-3.5-flash, 256K 上下文 | 通用对话、代码 |
| **ark** | 字节跳动 | volcengine 豆包代码模型 | 代码任务 |
| **minimax** | MiniMax | M2.7 高性能 | 分析、创意 |

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm (推荐) 或 npm

### 安装

```bash
# 克隆仓库
git clone https://github.com/sherlock-huang/llm-router.git
cd llm-router

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key
```

### 配置 API Key

编辑 `.env` 文件：

```env
# 阶跃星辰 (stepfun)
STEP_API_KEY=your_stepfun_api_key_here

# 字节跳动 ark (volcengine)
ARK_API_KEY=your_ark_api_key_here

# MiniMax
MINIMAX_API_KEY=your_minimax_api_key_here
```

### 启动服务

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm build
pnpm start
```

服务启动后访问：http://localhost:3044

---

## 📡 API 接口

### 聊天接口 (自动路由)

```bash
curl -X POST http://localhost:3044/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "用Python写一个快速排序函数"}],
    "model": "auto"
  }'
```

### 查看可用模型

```bash
curl http://localhost:3044/v1/models
```

### 路由调试

```bash
curl -X POST http://localhost:3044/v1/route \
  -H "Content-Type: application/json" \
  -d '{"content": "写一个Python爬虫"}'
```

---

## 🎨 Web 界面

启动服务后，打开浏览器访问 http://localhost:3044

功能包括：
- 📝 测试场景选择（代码/分析/创意/复杂）
- 🎯 模型选择（auto 智能路由 / 指定模型）
- 📊 Token 消耗统计（今日/本周/本月）
- ⭐ 多模型评分对比

---

## 📁 项目结构

```
llm-router/
├── public/
│   └── index.html          # Web 测试页面
├── src/
│   ├── api/
│   │   └── server.ts       # API 服务器
│   ├── config/
│   │   ├── loader.ts       # 配置加载器
│   │   └── models.yaml    # 模型配置
│   ├── models/
│   │   └── liteLLM_gateway.ts  # 模型网关
│   ├── router/
│   │   └── rule_based_router.ts # 规则路由
│   ├── tasks/
│   │   ├── task_analyzer.ts     # 任务分析
│   │   └── llm_task_analyzer.ts  # LLM 任务分析
│   └── types/
│       └── index.ts
├── .env                    # 环境变量 (需创建)
├── package.json
└── tsconfig.json
```

---

## ⚙️ 工作原理

```
用户请求
    ↓
任务分析 (关键词匹配 / LLM 智能分析)
    ↓
路由决策 → 代码任务 → ark / stepfun
         → 分析任务 → minimax
         → 创意任务 → minimax
    ↓
任务执行 (单模型 / 多模型分解)
    ↓
结果聚合 → 返回响应
```

### Phase 1: 规则路由

基于关键词匹配的快速路由：
- 代码关键词: `代码`, `Python`, `function`, `def ` 等 → ark
- 分析关键词: `解释`, `分析`, `什么是` 等 → minimax

### Phase 2: LLM 路由 (开发中)

通过 LLM 深度理解用户意图，更加精准地选择模型。

---

## 🌐 路由规则

| 任务类型 | 关键词示例 | 路由模型 |
|---------|-----------|---------|
| 代码 | Python, JavaScript, function, def, class, import, bug, 算法 | ark |
| 分析 | 解释, 分析, 为什么, 什么是, 比较, 区别 | minimax |
| 创意 | 写故事, 写诗, 创意, 文案, 小说 | minimax |
| 通用 | 其他 | minimax (默认) |

---

## 🔌 添加新模型

1. 在 `src/config/models.yaml` 添加模型配置
2. 在 `src/models/liteLLM_gateway.ts` 添加模型注册
3. 在 `src/router/rule_based_router.ts` 添加路由规则

---

## 📄 License

MIT

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<a name="english"></a>

# MOP - Multi-Model Orchestration Platform (English)

An intelligent LLM routing platform that automatically selects the most suitable model based on task type.

### Features

- **🎯 Smart Routing** - Auto-select best model based on task (code/analysis/creative)
- **🔄 Multi-Model Aggregation** - Unified API for multiple LLM providers
- **⚡ Task Decomposition** - Complex tasks auto-decomposed for parallel processing
- **💰 Cost Optimization** - Dispatch on-demand, avoid overusing expensive models
- **📊 Usage Statistics** - Real-time Token consumption tracking
- **⭐ Multi-Model Scoring** - Compare and score responses across models

### Quick Start

```bash
git clone https://github.com/sherlock-huang/llm-router.git
cd llm-router
pnpm install
cp .env.example .env
# Edit .env with your API keys
pnpm dev
```

Visit http://localhost:3044 for the web interface.

### API

```bash
# Chat with auto-routing
curl -X POST http://localhost:3044/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Write a Python quicksort function"}], "model": "auto"}'

# List models
curl http://localhost:3044/v1/models
```
