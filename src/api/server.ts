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
import { LLMTaskAnalyzer, getLLMAnalyzer } from '../tasks/llm_task_analyzer.js'
import { synthesizeSimple, synthesizeWithLLM, type SynthesisInput } from '../synthesizer/synthesizer.js'
import { loadConfig } from '../config/loader.js'

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

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

    // 2. 任务分析（Phase 2: 支持 LLM 驱动分析）
    const useLLM = req.headers['x-use-llm'] === 'true' || req.query['use_llm'] === 'true'
    let analysis: AnalysisResult
    let llmAnalysis: any = null

    if (useLLM) {
      // LLM 驱动的智能分析
      console.log('[Router] Using LLM-driven analysis (Phase 2)')
      const analyzer = getLLMAnalyzer()
      llmAnalysis = await analyzer.analyze(userMessage)
      analysis = {
        taskType: llmAnalysis.taskType,
        primaryModel: llmAnalysis.primaryModel,
        confidence: llmAnalysis.confidence,
        needsDecomposition: llmAnalysis.needsDecomposition,
        complexity: llmAnalysis.complexity,
        language: llmAnalysis.language
      }
      console.log(`[Router] LLM analysis: type=${llmAnalysis.taskType}, complexity=${llmAnalysis.complexity}, model=${llmAnalysis.primaryModel}, reason=${llmAnalysis.reasoning}`)
    } else {
      // 规则路由（Phase 1）
      analysis = analyzeTask(userMessage)
      console.log(`[Router] Task analysis: type=${analysis.taskType}, complexity=${analysis.complexity}, model=${analysis.primaryModel}`)
    }

    // 3. 任务分解（Phase 2: 支持 LLM 驱动的智能拆解）
    let decomposition
    if (useLLM && llmAnalysis) {
      const analyzer = getLLMAnalyzer()
      decomposition = await analyzer.decompose(userMessage, llmAnalysis)
      console.log(`[Router] LLM decomposition: needs=${decomposition.needsDecomposition}, subTasks=${decomposition.subTasks.length}`)
    } else {
      decomposition = decomposeTask(userMessage, analysis)
    }

    let result: string
    let sourceModel: string
    let aggregatedUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null

    // 检查用户是否指定了具体模型（不是auto）
    const requestedModel = validated.model ?? 'auto'
    const useExplicitModel = requestedModel !== 'auto'

    if (useExplicitModel) {
      // 用户指定了模型，直接使用该模型
      console.log(`[Router] Using explicitly requested model: ${requestedModel}`)
      sourceModel = requestedModel
      
      const response = await chatCompletion({
        model: requestedModel,
        messages: validated.messages,
        temperature: validated.temperature,
        maxTokens: validated.maxTokens
      })
      
      result = response.content
      if (response.usage) {
        aggregatedUsage = response.usage
      }
    } else if (decomposition.needsDecomposition && decomposition.subTasks.length > 0) {
      // ========== 复杂任务：多模型并行 + 聚合 ==========
      console.log(`[Router] Decomposing into ${decomposition.subTasks.length} sub-tasks`)

      // 并发执行所有子任务
      let totalPromptTokens = 0
      let totalCompletionTokens = 0
      
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

            if (response.usage) {
              totalPromptTokens += response.usage.promptTokens || 0
              totalCompletionTokens += response.usage.completionTokens || 0
            }

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

      // 聚合 token 使用量
      aggregatedUsage = {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens: totalPromptTokens + totalCompletionTokens
      }

      // 合成结果（Phase 2: 支持 LLM 驱动的智能合成）
      let synthesis
      if (useLLM) {
        console.log('[Router] Using LLM-driven synthesis (Phase 2)')
        synthesis = await synthesizeWithLLM(synthesisInputs, async (model, messages) => {
          const resp = await chatCompletion({ model, messages: messages as any })
          return resp.content
        })
      } else {
        synthesis = synthesizeSimple(synthesisInputs)
      }
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
      if (response.usage) {
        aggregatedUsage = response.usage
      }
    }

    // 4. 返回响应
    res.json({
      model: sourceModel,
      content: result,
      usage: aggregatedUsage,
      routing: {
        detectedType: analysis.taskType,
        complexity: analysis.complexity,
        confidence: analysis.confidence,
        llmDriven: useLLM || false,
        llmReasoning: llmAnalysis?.reasoning || null
      },
      decomposition: decomposition.needsDecomposition ? {
        reason: decomposition.reason,
        subTaskCount: decomposition.subTasks.length,
        subTasks: decomposition.subTasks.map((st: any) => ({
          id: st.id,
          description: st.description,
          model: st.assignedModel
        }))
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
  const hasApiKey = !!(
    process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY ||
    process.env.MOONSHOT_API_KEY || process.env.MINIMAX_API_KEY || process.env.ARK_API_KEY
  )
  res.json({
    models: models.map(m => ({
      name: m.name,
      provider: m.config.provider,
      supported: hasApiKey
    }))
  })
})

// 调试端点
app.get('/debug/env', (req: Request, res: Response) => {
  res.json({
    moonshot: process.env.MOONSHOT_API_KEY ? 'SET' : 'NOT SET',
    minimax: process.env.MINIMAX_API_KEY ? 'SET' : 'NOT SET',
    ark: process.env.ARK_API_KEY ? 'SET' : 'NOT SET'
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
// 手动路由测试：POST /v1/route (Phase 1 规则路由)
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
// Phase 2: LLM 驱动的智能路由测试：POST /v1/route/llm
// ============================================================
app.post('/v1/route/llm', async (req: Request, res: Response) => {
  const { content } = req.body
  if (!content || typeof content !== 'string') {
    res.status(400).json({ error: 'content is required' })
    return
  }

  try {
    const analyzer = getLLMAnalyzer()
    
    // LLM 分析
    const llmAnalysis = await analyzer.analyze(content)
    
    // LLM 拆解
    const decomposition = await analyzer.decompose(content, llmAnalysis)

    res.json({
      phase: 2,
      llmDriven: true,
      analysis: llmAnalysis,
      decomposition
    })
  } catch (error: any) {
    console.error('[LLMRoute] Error:', error)
    res.status(500).json({ error: 'LLM analysis failed', message: error.message })
  }
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
