/**
 * LLM Router API Server
 * 提供统一的大模型路由聚合接口
 */

import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import { z } from 'zod'
import { route, routeMultipleModels } from '../router/rule_based_router.js'
import { chatCompletion, listAvailableModels, type ChatMessage } from '../models/liteLLM_gateway.js'
import { analyzeTask, decomposeTask, type AnalysisResult } from '../tasks/task_analyzer.js'
import { synthesizeSimple, synthesizeWithLLM, type SynthesisInput } from '../synthesizer/synthesizer.js'
import { loadConfig } from '../config/loader.js'

const app = express()
app.use(cors())
app.use(express.json())

// 请求验证 Schema
const ChatCompletionSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string()
  })),
  model: z.string().optional(),  // 可选，路由会自动决定
  stream: z.boolean().optional().default(false),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  userId: z.string().optional()
})

// ============================================================
// 核心路由端点：POST /v1/chat/completions
// ============================================================
app.post('/v1/chat/completions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. 验证请求
    const validated = ChatCompletionSchema.parse(req.body)
    const userMessage = validated.messages[validated.messages.length - 1]?.content ?? ''
    const config = loadConfig()

    // 2. 任务分析
    const analysis = analyzeTask(userMessage)
    console.log(`[Router] Task analysis: type=${analysis.taskType}, complexity=${analysis.complexity}, model=${analysis.primaryModel}`)

    // 3. 任务分解
    const decomposition = decomposeTask(userMessage, analysis)

    let result: string
    let sourceModel: string

    if (decomposition.needsDecomposition && decomposition.subTasks.length > 0) {
      // ========== 复杂任务：多模型并行 + 聚合 ==========
      console.log(`[Router] Decomposing into ${decomposition.subTasks.length} sub-tasks`)

      // 并发执行所有子任务
      const synthesisInputs: SynthesisInput[] = await Promise.all(
        decomposition.subTasks.map(async (subTask) => {
          try {
            const subMessages: ChatMessage[] = [
              { role: 'system', content: `你是一个任务执行专家，负责完成以下子任务：${subTask.description}` },
              { role: 'user', content: userMessage }
            ]

            const response = await chatCompletion({
              model: subTask.assignedModel,
              messages: subMessages,
              temperature: validated.temperature,
              maxTokens: validated.maxTokens
            })

            return {
              subTaskId: subTask.id,
              model: subTask.assignedModel,
              content: response.content,
              success: true
            } as SynthesisInput
          } catch (error: any) {
            console.error(`[Router] SubTask ${subTask.id} failed:`, error.message)
            return {
              subTaskId: subTask.id,
              model: subTask.assignedModel,
              content: '',
              success: false,
              error: error.message
            } as SynthesisInput
          }
        })
      )

      // 合成结果
      const synthesis = synthesizeSimple(synthesisInputs)
      result = synthesis.finalContent
      sourceModel = synthesis.sources.map(s => s.model).join('+')

      if (synthesis.warnings.length > 0) {
        console.log(`[Router] Synthesis warnings:`, synthesis.warnings)
      }
    } else {
      // ========== 简单任务：直接路由到最佳模型 ==========
      const routingResult = route(userMessage)
      sourceModel = routingResult.model

      const response = await chatCompletion({
        model: routingResult.model,
        messages: validated.messages,
        temperature: validated.temperature,
        maxTokens: validated.maxTokens
      })

      result = response.content
    }

    // 4. 返回响应
    res.json({
      model: sourceModel,
      content: result,
      routing: {
        detectedType: analysis.taskType,
        complexity: analysis.complexity,
        confidence: analysis.confidence
      },
      decomposition: decomposition.needsDecomposition ? {
        reason: decomposition.reason,
        subTaskCount: decomposition.subTasks.length
      } : null
    })

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: error.errors })
    } else {
      console.error('[Router] Error:', error)
      next(error)
    }
  }
})

// ============================================================
// 可用模型列表：GET /v1/models
// ============================================================
app.get('/v1/models', (req: Request, res: Response) => {
  const models = listAvailableModels()
  res.json({
    models: models.map(m => ({
      name: m.name,
      provider: m.config.provider,
      supported: !!process.env.OPENAI_API_KEY || !!process.env.ANTHROPIC_API_KEY || !!process.env.GEMINI_API_KEY
    }))
  })
})

// ============================================================
// 健康检查：GET /health
// ============================================================
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  })
})

// ============================================================
// 手动路由测试：POST /v1/route
// ============================================================
app.post('/v1/route', (req: Request, res: Response) => {
  const { content } = req.body
  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'content is required' })
    return
  }

  const analysis = analyzeTask(content)
  const decomposition = decomposeTask(content, analysis)

  res.json({
    routing: route(content),
    analysis,
    decomposition
  })
})

// ============================================================
// 错误处理中间件
// ============================================================
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Server Error]', err)
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  })
})

// ============================================================
// 启动
// ============================================================
const PORT = process.env.PORT ?? 3000

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║       LLM Router API Server                          ║
║       大模型智能路由聚合平台                          ║
╠══════════════════════════════════════════════════════╣
║  Local:    http://localhost:${PORT}                     ║
║  Health:   http://localhost:${PORT}/health              ║
║  Models:   http://localhost:${PORT}/v1/models           ║
║  Route:    POST /v1/chat/completions                  ║
╚══════════════════════════════════════════════════════╝
  `)
})

export default app
