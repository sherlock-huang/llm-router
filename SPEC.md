# LLM Router — 大模型智能路由聚合平台

## 1. Concept & Vision

一个智能路由层：接收用户请求 → 分析意图 → 智能分发到最适合的大模型 → 结果聚合 → 返回给用户。

核心价值：让用户无感知地获得最佳模型组合的能力，同时降低使用成本、提升响应质量。

## 2. Architecture

```
User Request
    │
    ▼
┌─────────────────┐
│   API Gateway   │  FastAPI / Express
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Task Analyzer │  分析任务类型、复杂度、是否需要拆解
│  (Analyzer LLM) │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐  ┌──────────────────┐
│ 简单   │  │ 复杂任务拆解     │
│ 路由   │  │ (Decomposer LLM) │
└───┬────┘  └────────┬─────────┘
    │                 │
    ▼                 ▼
┌─────────────────────────────┐
│       Model Gateway         │
│  LiteLLM 统一调用层         │
│  - OpenAI GPT-4o           │
│  - Anthropic Claude        │
│  - Google Gemini           │
│  - 本地模型 (Ollama)        │
└────────────┬───────────────┘
             │
             ▼
┌─────────────────────────────┐
│       Synthesizer          │
│  结果聚合 + 质量校验         │
└────────────┬───────────────┘
             │
             ▼
        Final Response
```

## 3. Routing Strategy

### 规则路由（Phase 1 — 本周完成）

| 任务类型 | 关键词/模式 | 路由目标 |
|---------|------------|---------|
| 代码生成/调试 | `写代码`, `debug`, `function`, `class`, `代码` | GPT-4o / Claude |
| 创意写作 | `写故事`, `写诗`, `创意`, `文案` | GPT-4o |
| 知识问答/分析 | `解释`, `分析`, `为什么`, `什么是` | Claude |
| 数学/推理 | `计算`, `推理`, `证明`, `数学` | GPT-4o |
| 搜索增强 | `最新`, `实时`, `查一下`, `新闻` | Gemini |
| 长文本总结 | `总结`, `摘要`, `概括` | Claude |
| 图像相关 | `画`, `图`, `设计` | GPT-4o (Vision) |

### 智能路由（Phase 2 — 待开发）
- 用 Analyzer LLM 判断任务特征
- 输出结构化 JSON 包含：任务类型、推荐模型、是否需要拆解、拆解粒度

## 4. Task Decomposition

当任务复杂度高时，自动拆解：

```
原始任务: "帮我写一个用户注册功能，包括前端表单和后端API"
     │
     ▼
[
  { "sub_task": "设计数据库表结构", "model": "Claude" },
  { "sub_task": "编写后端注册API", "model": "GPT-4o" },
  { "sub_task": "编写前端注册表单", "model": "GPT-4o" }
]
     │
     ▼
并发执行 → 等待全部完成 → Synthesizer 聚合
```

## 5. API Design

### POST /v1/chat/completions
统一入口，兼容 OpenAI 格式

```json
// Request
{
  "messages": [{"role": "user", "content": "帮我写一个Python快速排序"}],
  "user_id": "user_123"
}

// Response (流式)
data: {"model": "gpt-4o", "content": "def quick_sort..."}
data: {"model": "claude", "content": "..."}
data: [DONE]
```

### GET /v1/models
可用模型列表

### GET /health
健康检查

## 6. Configuration

模型配置通过 `config/models.yaml` 管理：

```yaml
models:
  gpt-4o:
    provider: openai
    api_key_env: OPENAI_API_KEY
    max_tokens: 4096
    routing_rules:
      - keywords: ["代码", "写代码", "function", "debug"]
        score: 0.9

  claude:
    provider: anthropic
    api_key_env: ANTHROPIC_API_KEY
    max_tokens: 4096
    routing_rules:
      - keywords: ["解释", "分析", "为什么"]
        score: 0.85
```

## 7. Phase 1 交付（已完成）

- [x] 项目结构搭建
- [x] SPEC.md 编写
- [x] `router/rule_based_router.ts` — 规则路由核心
- [x] `models/liteLLM_gateway.ts` — 模型网关封装
- [x] `tasks/task_analyzer.ts` — 任务类型分析（启发式）
- [x] `api/server.ts` — API 服务 + 端点
- [x] `config/models.yaml` — 模型配置

## 7b. Phase 2 交付（已完成）

- [x] `tasks/llm_task_analyzer.ts` — LLM 驱动的任务分析器
- [x] `analyze()` — LLM 智能分析任务类型、复杂度、推荐模型
- [x] `decompose()` — LLM 智能拆解复杂任务
- [x] `synthesizeWithLLM()` — LLM 驱动的结果聚合
- [x] 集成到 `server.ts` — 通过 `x-use-llm: true` header 启用
- [x] `POST /v1/route/llm` — 专用 Phase 2 测试端点

### Phase 2 使用方式

**方式一：Header 启用**
```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-use-llm: true" \
  -d '{"messages": [{"role": "user", "content": "帮我写一个用户注册功能，包括前端和后端"}]}'
```

**方式二：专用测试端点**
```bash
curl -X POST http://localhost:3000/v1/route/llm \
  -H "Content-Type: application/json" \
  -d '{"content": "帮我写一个用户注册功能，包括前端和后端"}'
```

**Phase 2 响应示例**
```json
{
  "phase": 2,
  "llmDriven": true,
  "analysis": {
    "taskType": "code",
    "primaryModel": "gpt-4o",
    "confidence": 0.92,
    "needsDecomposition": true,
    "complexity": "high",
    "reasoning": "任务涉及前后端完整功能，需要拆解"
  },
  "decomposition": {
    "needsDecomposition": true,
    "reason": "LLM 智能拆解",
    "subTasks": [
      {"id": "task-1", "description": "设计数据库表结构", "assignedModel": "claude", "dependencies": [], "priority": 1},
      {"id": "task-2", "description": "实现后端注册API", "assignedModel": "gpt-4o", "dependencies": [], "priority": 2},
      {"id": "task-3", "description": "实现前端注册表单", "assignedModel": "gpt-4o", "dependencies": ["task-2"], "priority": 3}
    ]
  }
}
```

## 8. Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js / FastAPI (Python)
- **Model Gateway**: LiteLLM
- **Task Queue**: In-memory (Phase 1) → Redis/Bull (Phase 2)
- **Config**: YAML
- **Testing**: Jest / Vitest
