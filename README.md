# LLM Router — 大模型智能路由聚合平台

一个智能路由层：接收用户请求 → 分析意图 → 分发到最适合的大模型 → 结果聚合 → 返回给用户。

**核心价值**：让用户无感知地获得最佳模型组合的能力，降低成本、提升响应质量。

## 功能特性

- 🔀 **智能路由** — 根据任务类型（代码/写作/分析/搜索）自动选择最佳模型
- ⚡ **任务拆解** — 复杂任务自动分解为多个子任务，并行处理后再聚合
- 🌐 **多模型支持** — OpenAI GPT-4o / Anthropic Claude / Google Gemini / 本地 Ollama
- 📦 **统一 API** — 兼容 OpenAI API 格式，零成本迁移
- 🔧 **规则配置** — 通过 YAML 灵活配置路由规则和模型参数

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
# 至少需要一个 API Key
export OPENAI_API_KEY=sk-xxxx
export ANTHROPIC_API_KEY=sk-ant-xxxx
export GEMINI_API_KEY=xxxx
```

### 3. 启动服务

```bash
# 开发模式（热重载）
npm run dev

# 生产模式
npm run build
npm start
```

服务启动在 `http://localhost:3000`

### 4. 发送请求

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "帮我用Python写一个快速排序"}
    ]
  }'
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/v1/chat/completions` | POST | 统一聊天接口（兼容 OpenAI） |
| `/v1/models` | GET | 查看可用模型列表 |
| `/v1/route` | POST | 测试路由决策（调试用） |
| `/health` | GET | 健康检查 |

## 路由规则

| 任务类型 | 路由模型 | 触发关键词 |
|---------|---------|-----------|
| 代码生成 | GPT-4o | `代码`, `function`, `Python`... |
| 分析问答 | Claude | `解释`, `分析`, `为什么`... |
| 创意写作 | GPT-4o | `写故事`, `文案`, `小说`... |
| 总结摘要 | Claude | `总结`, `摘要`, `概括`... |
| 搜索增强 | Gemini | `最新`, `实时`, `新闻`... |

## 项目结构

```
llm-router/
├── src/
│   ├── api/
│   │   └── server.ts          # Express API 服务
│   ├── router/
│   │   └── rule_based_router.ts  # 规则路由核心
│   ├── models/
│   │   └── liteLLM_gateway.ts    # 统一模型网关
│   ├── tasks/
│   │   └── task_analyzer.ts      # 任务分析与拆解
│   ├── synthesizer/
│   │   └── synthesizer.ts        # 多模型结果聚合
│   └── config/
│       ├── loader.ts             # 配置加载器
│       └── models.yaml           # 模型配置
├── tests/
│   ├── router.test.ts
│   └── task_analyzer.test.ts
├── SPEC.md
├── package.json
└── tsconfig.json
```

## 配置说明

编辑 `src/config/models.yaml` 自定义：

```yaml
models:
  gpt-4o:
    provider: openai
    model: gpt-4o
    max_tokens: 4096
    routing:
      keywords:
        - 代码
        - function
      score: 0.9
```

## Roadmap

- [ ] Phase 1: 规则路由 + 简单任务拆解（当前）
- [ ] Phase 2: LLM 驱动的智能路由
- [ ] Phase 3: Redis 任务队列 + 分布式部署
- [ ] Phase 4: 路由学习（基于历史数据自动优化）
- [ ] Phase 5: Web 管理界面
