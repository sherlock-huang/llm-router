/**
 * LLM-driven Task Analyzer — Phase 2
 * 用 Analyzer LLM 智能分析任务类型、复杂度、推荐模型
 */

import { chatCompletion, type ChatMessage } from '../models/liteLLM_gateway.js'
import { type TaskType } from '../router/rule_based_router.js'

export interface LLMAnalysisResult {
  taskType: TaskType
  primaryModel: string
  confidence: number
  needsDecomposition: boolean
  complexity: 'low' | 'medium' | 'high'
  language?: string
  reasoning: string
  suggestedSubTasks?: {
    description: string
    assignedModel: string
    dependencies: string[]
    priority: number
  }[]
}

/**
 * LLM 任务分析器
 */
export class LLMTaskAnalyzer {
  private analyzerModel: string

  constructor(analyzerModel: string = 'minimax') {
    this.analyzerModel = analyzerModel
  }

  /**
   * 用 LLM 分析任务
   */
  async analyze(content: string): Promise<LLMAnalysisResult> {
    const systemPrompt = `你是一个任务分析专家。分析用户请求并输出结构化的 JSON 决策。

分析维度：
1. task_type: 代码(code)/创意写作(creative)/分析问答(analysis)/数学推理(reasoning)/搜索增强(search)/总结摘要(summary)/图像(vision)/通用(general)
2. primary_model: 推荐模型 (gpt-4o/claude/gemini)
3. confidence: 置信度 0-1
4. complexity: 复杂度 (low/medium/high)
5. needs_decomposition: 是否需要拆解
6. language: 编程语言（如果是代码任务）
7. reasoning: 分析理由

输出格式（严格 JSON，不要其他内容）：
{
  "taskType": "code|creative|analysis|reasoning|search|summary|vision|general",
  "primaryModel": "gpt-4o|claude|gemini",
  "confidence": 0.0-1.0,
  "needsDecomposition": true|false,
  "complexity": "low|medium|high",
  "language": "Python|JavaScript|...",
  "reasoning": "分析理由..."
}`

    try {
      const response = await chatCompletion({
        model: this.analyzerModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请分析以下任务：\n${content}` }
        ],
        temperature: 0.3,
        maxTokens: 500
      })

      // 去掉 markdown 代码块包装
      let jsonStr = response.content.trim()
      jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/```\s*$/i, '')
      jsonStr = jsonStr.replace(/^```\s*/i, '').replace(/```\s*$/i, '')
      
      const parsed = JSON.parse(jsonStr)
      // Map suggested model names to our actual registry models
      const modelMap: Record<string, string> = {
        'gpt-4o': 'ark',
        'claude': 'minimax',
        'gemini': 'minimax',
        'kimi': 'ark',
        'minimax': 'minimax',
        'ark': 'ark',
        'stepfun': 'ark'
      }
      const suggestedModel = parsed.primaryModel?.toLowerCase() || 'minimax'
      const mappedModel = modelMap[suggestedModel] || 'minimax'

      return {
        taskType: parsed.taskType || 'general',
        primaryModel: mappedModel,
        confidence: parsed.confidence ?? 0.7,
        needsDecomposition: parsed.needsDecomposition ?? false,
        complexity: parsed.complexity || 'low',
        language: parsed.language,
        reasoning: parsed.reasoning || ''
      }
    } catch (error) {
      console.error('[LLMAnalyzer] Analysis failed, using fallback:', error)
      return this.fallbackAnalysis(content)
    }
  }

  /**
   * LLM 驱动的任务拆解
   */
  async decompose(content: string, analysis: LLMAnalysisResult): Promise<{
    needsDecomposition: boolean
    reason: string
    subTasks: {
      id: string
      description: string
      assignedModel: string
      dependencies: string[]
      priority: number
    }[]
  }> {
    if (!analysis.needsDecomposition) {
      return {
        needsDecomposition: false,
        reason: '任务复杂度低，无需拆解',
        subTasks: []
      }
    }

    const systemPrompt = `你是一个任务拆解专家。分析复杂任务并拆解为可并行的子任务。

输出格式（严格 JSON）：
{
  "needsDecomposition": true,
  "reason": "拆解原因",
  "subTasks": [
    {
      "description": "子任务描述",
      "assignedModel": "gpt-4o|claude|gemini",
      "dependencies": ["依赖的子任务id，如 task-1"],
      "priority": 1-3
    }
  ]
}

原则：
- 子任务数量控制在 2-5 个
- 依赖关系要合理
- 每个子任务要有明确的模型推荐`

    try {
      const response = await chatCompletion({
        model: this.analyzerModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请拆解以下任务：\n${content}` }
        ],
        temperature: 0.5,
        maxTokens: 800
      })

      // 去掉 markdown 代码块包装
      let decompJson = response.content.trim()
      decompJson = decompJson.replace(/^```json\s*/i, '').replace(/```\s*$/i, '')
      decompJson = decompJson.replace(/^```\s*/i, '').replace(/```\s*$/i, '')
      
      const parsed = JSON.parse(decompJson)
      
      // 添加 task IDs
      const subTasks = (parsed.subTasks || []).map((st: any, idx: number) => ({
        id: `task-${idx + 1}`,
        description: st.description || st.desc || '',
        assignedModel: st.assignedModel || st.model || 'gpt-4o',
        dependencies: st.dependencies || [],
        priority: st.priority || 1
      }))

      return {
        needsDecomposition: parsed.needsDecomposition ?? true,
        reason: parsed.reason || 'LLM 智能拆解',
        subTasks
      }
    } catch (error) {
      console.error('[LLMAnalyzer] Decomposition failed, using fallback:', error)
      return this.fallbackDecomposition(content, analysis)
    }
  }

  /**
   * 降级分析（LLM 失败时使用）
   */
  private fallbackAnalysis(content: string): LLMAnalysisResult {
    const lower = content.toLowerCase()
    
    // 简单的关键词匹配作为降级
    let taskType: TaskType = 'general'
    if (/代码|function|def |class |import |debug|bug|算法|编程|python|javascript|java|rust|sql|api|接口|stepfun/.test(lower)) {
      taskType = 'code'
    } else if (/写故事|写诗|创意|文案|小说|剧本|歌词/.test(lower)) {
      taskType = 'creative'
    } else if (/解释|分析|为什么|什么是|比较|对比|区别/.test(lower)) {
      taskType = 'analysis'
    } else if (/计算|推理|证明|数学|逻辑|推导/.test(lower)) {
      taskType = 'reasoning'
    } else if (/总结|摘要|概括|提炼/.test(lower)) {
      taskType = 'summary'
    }

    let complexity: 'low' | 'medium' | 'high' = 'low'
    if (/完整项目|全栈|系统设计|架构|多个模块/.test(lower)) {
      complexity = 'high'
    } else if (/类|模块|组件|函数|接口|表/.test(lower)) {
      complexity = 'medium'
    }

    const languageMap: Record<string, string> = {
      python: 'Python', javascript: 'JavaScript', typescript: 'TypeScript',
      java: 'Java', 'c++': 'C++', rust: 'Rust', go: 'Go', sql: 'SQL'
    }
    let language: string | undefined
    for (const [kw, lang] of Object.entries(languageMap)) {
      if (lower.includes(kw)) { language = lang; break }
    }

    return {
      taskType,
      primaryModel: taskType === 'code' ? 'ark' : 'minimax',
      confidence: 0.6,
      needsDecomposition: complexity === 'high' || (taskType === 'code' && content.length > 500),
      complexity,
      language,
      reasoning: 'Fallback (LLM analysis failed)'
    }
  }

  /**
   * 降级拆解（LLM 失败时使用）
   */
  private fallbackDecomposition(content: string, analysis: LLMAnalysisResult): {
    needsDecomposition: boolean
    reason: string
    subTasks: { id: string; description: string; assignedModel: string; dependencies: string[]; priority: number }[]
  } {
    const lower = content.toLowerCase()
    const subTasks: any[] = []
    let taskId = 1

    if (analysis.taskType === 'code' || analysis.complexity === 'high') {
      if (lower.includes('前端') || lower.includes('界面') || lower.includes('ui')) {
        subTasks.push({ id: `task-${taskId++}`, description: '设计数据结构和数据模型', assignedModel: 'minimax', dependencies: [], priority: 1 })
      }
      if (lower.includes('后端') || lower.includes('api') || lower.includes('接口')) {
        subTasks.push({ id: `task-${taskId++}`, description: '实现后端业务逻辑和API', assignedModel: 'ark', dependencies: [], priority: 2 })
      }
      if (lower.includes('前端') || lower.includes('界面') || lower.includes('ui') || lower.includes('表单')) {
        subTasks.push({ id: `task-${taskId++}`, description: '实现前端界面和交互', assignedModel: 'ark', dependencies: [], priority: 3 })
      }
    }

    if (subTasks.length === 0) {
      subTasks.push({ id: `task-${taskId++}`, description: '核心功能实现', assignedModel: analysis.primaryModel, dependencies: [], priority: 1 })
      subTasks.push({ id: `task-${taskId++}`, description: '代码测试和验证', assignedModel: 'ark', dependencies: ['task-1'], priority: 2 })
    }

    return {
      needsDecomposition: true,
      reason: 'Fallback (LLM decomposition failed)',
      subTasks
    }
  }
}

// 默认分析器实例
let defaultAnalyzer: LLMTaskAnalyzer | null = null

export function getLLMAnalyzer(): LLMTaskAnalyzer {
  if (!defaultAnalyzer) {
    defaultAnalyzer = new LLMTaskAnalyzer()
  }
  return defaultAnalyzer
}
