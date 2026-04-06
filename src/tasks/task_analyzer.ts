/**
 * Task Analyzer & Decomposer
 * 分析任务复杂度，决定是否需要拆解，并执行拆解
 */

import { route, routeMultipleModels, type TaskType } from '../router/rule_based_router.js'

export interface SubTask {
  id: string
  description: string
  assignedModel: string
  dependencies: string[]  // 依赖的其他 sub_task id
  priority: number
}

export interface DecompositionResult {
  needsDecomposition: boolean
  reason: string
  primaryModel: string
  subTasks: SubTask[]
}

export interface AnalysisResult {
  taskType: TaskType
  primaryModel: string
  confidence: number
  needsDecomposition: boolean
  complexity: 'low' | 'medium' | 'high'
  language?: string  // 编程语言（如果是代码任务）
}

// 复杂度关键词判断
const HIGH_COMPLEXITY_KEYWORDS = [
  '完整项目', '全栈', '系统设计', '架构', '多个模块',
  '前端后端', '数据库', '登录注册', '支付', '完整功能'
]

const MEDIUM_COMPLEXITY_KEYWORDS = [
  '类', '模块', '组件', '函数', '接口', '表', '设计模式',
  '优化', '重构', '重写', '迁移'
]

const CODE_INDICATORS = [
  'python', 'javascript', 'typescript', 'java', 'c++', 'rust',
  'go', 'golang', 'sql', 'html', 'css', 'react', 'vue', 'node'
]

const LANGUAGE_KEYWORDS: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  'c++': 'C++',
  rust: 'Rust',
  go: 'Go',
  golang: 'Go',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  react: 'React',
  vue: 'Vue',
  node: 'Node.js'
}

export function analyzeTask(content: string): AnalysisResult {
  const routingResult = route(content)
  const lower = content.toLowerCase()

  // 检测编程语言
  let detectedLang: string | undefined
  for (const [keyword, lang] of Object.entries(LANGUAGE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      detectedLang = lang
      break
    }
  }

  // 判断复杂度
  let complexity: 'low' | 'medium' | 'high' = 'low'
  for (const kw of HIGH_COMPLEXITY_KEYWORDS) {
    if (lower.includes(kw)) {
      complexity = 'high'
      break
    }
  }
  if (complexity === 'low') {
    for (const kw of MEDIUM_COMPLEXITY_KEYWORDS) {
      if (lower.includes(kw)) {
        complexity = 'medium'
        break
      }
    }
  }

  // 复杂任务需要拆解
  const needsDecomposition = complexity === 'high' || 
    routingResult.type === 'code' && (content.length > 500 || lower.includes('完整') || lower.includes('项目'))

  return {
    taskType: routingResult.type,
    primaryModel: routingResult.model,
    confidence: routingResult.confidence,
    needsDecomposition,
    complexity,
    language: detectedLang
  }
}

export function decomposeTask(content: string, analysis: AnalysisResult): DecompositionResult {
  if (!analysis.needsDecomposition) {
    return {
      needsDecomposition: false,
      reason: '任务复杂度低，无需拆解',
      primaryModel: analysis.primaryModel,
      subTasks: []
    }
  }

  // 启发式任务拆解（Phase 1 实现，Phase 2 替换为 LLM 拆解）
  const subTasks: SubTask[] = []
  let taskId = 1

  const lower = content.toLowerCase()

  // 基础拆解策略
  if (analysis.taskType === 'code' || analysis.complexity === 'high') {
    // 代码任务：数据结构 → 核心逻辑 → 接口/UI → 测试
    if (lower.includes('前端') || lower.includes('界面') || lower.includes('ui')) {
      subTasks.push({
        id: `task-${taskId++}`,
        description: '设计数据结构和数据模型',
        assignedModel: 'minimax',
        dependencies: [],
        priority: 1
      })
    }

    if (lower.includes('后端') || lower.includes('api') || lower.includes('接口')) {
      subTasks.push({
        id: `task-${taskId++}`,
        description: '实现后端业务逻辑和API',
        assignedModel: 'ark',
        dependencies: [],
        priority: 2
      })
    }

    if (lower.includes('前端') || lower.includes('界面') || lower.includes('ui') || lower.includes('表单')) {
      subTasks.push({
        id: `task-${taskId++}`,
        description: '实现前端界面和交互',
        assignedModel: 'ark',
        dependencies: [],
        priority: 3
      })
    }

    if (!subTasks.length) {
      // 默认代码拆解
      subTasks.push({
        id: `task-${taskId++}`,
        description: '核心功能实现',
        assignedModel: analysis.primaryModel,
        dependencies: [],
        priority: 1
      })
      subTasks.push({
        id: `task-${taskId++}`,
        description: '代码测试和验证',
        assignedModel: 'ark',
        dependencies: [`task-1`],
        priority: 2
      })
    }
  } else {
    // 非代码复杂任务
    subTasks.push({
      id: `task-${taskId++}`,
      description: '任务分析和信息收集',
      assignedModel: 'minimax',
      dependencies: [],
      priority: 1
    })
    subTasks.push({
      id: `task-${taskId++}`,
      description: '核心内容生成',
      assignedModel: analysis.primaryModel,
      dependencies: [`task-1`],
      priority: 2
    })
  }

  return {
    needsDecomposition: true,
    reason: `任务复杂度为 ${analysis.complexity}，已拆分为 ${subTasks.length} 个子任务`,
    primaryModel: analysis.primaryModel,
    subTasks
  }
}

// Phase 2: LLM 驱动的任务拆解（预留接口）
export async function decomposeWithLLM(
  content: string, 
  model: string, 
  chatFn: (model: string, messages: {role: string; content: string}[]) => Promise<string>
): Promise<DecompositionResult> {
  const systemPrompt = `你是一个任务拆解专家。分析用户任务并拆解为可并行的子任务。
输出格式（严格JSON）：
{
  "needsDecomposition": true/false,
  "reason": "拆解/不拆解的原因",
  "subTasks": [
    {
      "description": "子任务描述",
      "assignedModel": "推荐模型（gpt-4o/claude/gemini）",
      "dependencies": ["依赖的子任务id"],
      "priority": 1-3
    }
  ]
}
只输出JSON，不要其他内容。`

  const resultText = await chatFn(model, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请拆解以下任务：\n${content}` }
  ])

  try {
    const parsed = JSON.parse(resultText)
    return parsed as DecompositionResult
  } catch {
    // LLM 输出格式错误，降级到启发式拆解
    const analysis = analyzeTask(content)
    return decomposeTask(content, analysis)
  }
}
