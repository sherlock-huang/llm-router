# MOP 大模型智能路由平台 - 测试指南

## 🎯 MOP 核心价值

1. **智能路由** - 根据任务类型自动选择最合适的模型
2. **多模型聚合** - 统一接口调用多个大模型
3. **任务拆解** - 复杂任务自动分解并行处理
4. **成本优化** - 按需调度，避免浪费

---

## 🚀 快速启动

```bash
cd llm-router
npm run dev
```

服务运行在 `http://localhost:3044`

---

## 🧪 测试场景

### 场景 1: 代码任务 → 应路由到 Stepfun

**请求:**
```bash
curl -X POST http://localhost:3044/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "用Python写一个快速排序函数"}],
    "model": "auto"
  }'
```

**期望结果:**
- `routing.detectedType`: `code`
- `routing.sourceModel`: `stepfun`（或实际调用的模型名）
- 返回代码内容

---

### 场景 2: 分析任务 → 应路由到 Minimax

**请求:**
```bash
curl -X POST http://localhost:3044/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "解释一下什么是快速排序算法，它的时间复杂度是多少？"}],
    "model": "auto"
  }'
```

**期望结果:**
- `routing.detectedType`: `analysis`
- `routing.sourceModel`: `minimax`

---

### 场景 3: 复杂任务自动拆解

**请求:**
```bash
curl -X POST http://localhost:3044/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "帮我写一个完整的用户登录系统，包括前端界面和后端API"}],
    "model": "auto"
  }'
```

**期望结果:**
- `decomposition.needsDecomposition`: `true`
- `decomposition.subTaskCount`: 2-3
- 子任务并行执行后聚合结果

---

### 场景 4: LLM 驱动的智能路由（Phase 2）

**请求:**
```bash
curl -X POST http://localhost:3044/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-use-llm: true" \
  -d '{
    "messages": [{"role": "user", "content": "写一个Python脚本从API获取数据并存入MySQL数据库"}],
    "model": "auto"
  }'
```

**期望结果:**
- `routing.llmDriven`: `true`
- `routing.llmReasoning`: LLM 分析理由

---

### 场景 5: 直接指定模型

```bash
# 直接调用 stepfun
curl -X POST http://localhost:3044/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "你好，请介绍你自己"}],
    "model": "stepfun"
  }'

# 直接调用 minimax
curl -X POST http://localhost:3044/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "解释量子计算的基本原理"}],
    "model": "minimax"
  }'
```

---

### 场景 6: 查看可用模型

```bash
curl http://localhost:3044/v1/models
```

**返回示例:**
```json
{
  "models": [
    {"name": "stepfun", "provider": "stepfun", "supported": true},
    {"name": "minimax", "provider": "minimax", "supported": true},
    {"name": "ark", "provider": "bytedance", "supported": true}
  ]
}
```

---

### 场景 7: 路由调试接口

```bash
curl -X POST http://localhost:3044/v1/route \
  -H "Content-Type: application/json" \
  -d '{"content": "帮我写一个Python爬虫"}'
```

**返回:**
```json
{
  "routing": {
    "type": "code",
    "model": "stepfun",
    "confidence": 0.95,
    "reason": "匹配到关键词 [python]，类型判定为 code"
  },
  "analysis": { ... },
  "decomposition": { ... }
}
```

---

## 📊 响应格式

```json
{
  "model": "stepfun",
  "content": "生成的代码或回答...",
  "routing": {
    "detectedType": "code",
    "complexity": "low",
    "confidence": 0.95,
    "llmDriven": false,
    "llmReasoning": null
  },
  "decomposition": {
    "reason": "任务复杂度低，无需拆解",
    "subTaskCount": 0,
    "subTasks": []
  }
}
```

---

## 🔧 API 端点总览

| 端点 | 方法 | 说明 |
|------|------|------|
| `/v1/chat/completions` | POST | 核心聊天接口（自动路由） |
| `/v1/models` | GET | 查看可用模型 |
| `/v1/route` | POST | 路由调试（Phase 1 规则路由） |
| `/v1/route/llm` | POST | LLM 驱动的路由测试 |
| `/debug/env` | GET | 查看环境变量配置状态 |
| `/health` | GET | 健康检查 |

---

## 🎓 核心流程图

```
用户请求
    ↓
任务分析 (分析用户意图)
    ↓
路由决策 → 代码任务 → stepfun
         → 分析任务 → minimax  
         → 创意任务 → ark
    ↓
任务执行
    ↓
[可选] 复杂任务拆解 → 并行执行子任务 → 结果聚合
    ↓
返回结果
```

---

## 💡 测试技巧

1. **观察路由日志** - 服务启动后会打印路由决策日志
2. **对比不同模型** - 同一问题不同模型的效果对比
3. **测试拆解能力** - 使用复杂的多模块请求
4. **验证模型映射** - Phase 2 的 LLM 分析会显示推理过程

---

## ⚠️ 常见问题

- **403/401 错误**: 检查 API Key 是否正确配置
- **路由不准**: 可使用 `/v1/route` 调试关键词匹配
- **服务未响应**: 检查端口是否被占用 `lsof -i :3044`
