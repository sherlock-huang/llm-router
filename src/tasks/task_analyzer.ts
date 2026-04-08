import { route, type TaskType } from '../router/rule_based_router.js'

export interface SubTask {
  id: string
  description: string
  assignedModel: string
  dependencies: string[]
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
  language?: string
}

const HIGH_COMPLEXITY_KEYWORDS = [
  '完整项目',
  '全栈',
  '系统设计',
  '架构',
  '多个模块',
  '前端后端',
  '数据库',
  '登录注册',
  '支付',
  '完整功能',
  'complete project',
  'full stack',
  'system design',
  'architecture',
  'frontend and backend',
  'login and registration',
  'payment',
]

const MEDIUM_COMPLEXITY_KEYWORDS = [
  '类',
  '模块',
  '组件',
  '函数',
  '接口',
  '表单',
  '设计模式',
  '优化',
  '重构',
  '重写',
  '迁移',
  'class',
  'module',
  'component',
  'function',
  'interface',
  'form',
  'refactor',
  'rewrite',
  'migration',
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
  node: 'Node.js',
}

export function analyzeTask(content: string): AnalysisResult {
  const routingResult = route(content)
  const lower = content.toLowerCase()

  let detectedLang: string | undefined
  for (const [keyword, lang] of Object.entries(LANGUAGE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      detectedLang = lang
      break
    }
  }

  let complexity: 'low' | 'medium' | 'high' = 'low'
  for (const keyword of HIGH_COMPLEXITY_KEYWORDS) {
    if (lower.includes(keyword)) {
      complexity = 'high'
      break
    }
  }

  if (complexity === 'low') {
    for (const keyword of MEDIUM_COMPLEXITY_KEYWORDS) {
      if (lower.includes(keyword)) {
        complexity = 'medium'
        break
      }
    }
  }

  const needsDecomposition =
    complexity === 'high' ||
    (routingResult.type === 'code' &&
      (content.length > 500 ||
        lower.includes('完整') ||
        lower.includes('项目') ||
        lower.includes('complete') ||
        lower.includes('project')))

  return {
    taskType: routingResult.type,
    primaryModel: routingResult.model,
    confidence: routingResult.confidence,
    needsDecomposition,
    complexity,
    language: detectedLang,
  }
}

export function decomposeTask(content: string, analysis: AnalysisResult): DecompositionResult {
  if (!analysis.needsDecomposition) {
    return {
      needsDecomposition: false,
      reason: 'Task complexity is low and does not require decomposition.',
      primaryModel: analysis.primaryModel,
      subTasks: [],
    }
  }

  const subTasks: SubTask[] = []
  let taskId = 1
  const lower = content.toLowerCase()

  if (analysis.taskType === 'code' || analysis.complexity === 'high') {
    if (lower.includes('前端') || lower.includes('界面') || lower.includes('ui') || lower.includes('frontend')) {
      subTasks.push({
        id: `task-${taskId++}`,
        description: 'Design the data structure and UI interaction plan.',
        assignedModel: 'minimax',
        dependencies: [],
        priority: 1,
      })
    }

    if (lower.includes('后端') || lower.includes('api') || lower.includes('接口') || lower.includes('backend')) {
      subTasks.push({
        id: `task-${taskId++}`,
        description: 'Implement the backend logic and API layer.',
        assignedModel: 'ark',
        dependencies: [],
        priority: 2,
      })
    }

    if (lower.includes('前端') || lower.includes('界面') || lower.includes('ui') || lower.includes('表单') || lower.includes('frontend') || lower.includes('form')) {
      subTasks.push({
        id: `task-${taskId++}`,
        description: 'Build the frontend view and user interaction layer.',
        assignedModel: 'ark',
        dependencies: [],
        priority: 3,
      })
    }

    if (subTasks.length === 0) {
      subTasks.push({
        id: `task-${taskId++}`,
        description: 'Implement the core functionality.',
        assignedModel: analysis.primaryModel,
        dependencies: [],
        priority: 1,
      })
      subTasks.push({
        id: `task-${taskId++}`,
        description: 'Test and verify the implementation.',
        assignedModel: 'ark',
        dependencies: ['task-1'],
        priority: 2,
      })
    }
  } else {
    subTasks.push({
      id: `task-${taskId++}`,
      description: 'Analyze the task and gather the key information.',
      assignedModel: 'minimax',
      dependencies: [],
      priority: 1,
    })
    subTasks.push({
      id: `task-${taskId++}`,
      description: 'Generate the final response or plan.',
      assignedModel: analysis.primaryModel,
      dependencies: ['task-1'],
      priority: 2,
    })
  }

  return {
    needsDecomposition: true,
    reason: `Task complexity is ${analysis.complexity}, so it was decomposed into ${subTasks.length} sub-tasks.`,
    primaryModel: analysis.primaryModel,
    subTasks,
  }
}

export async function decomposeWithLLM(
  content: string,
  model: string,
  chatFn: (model: string, messages: { role: string; content: string }[]) => Promise<string>,
): Promise<DecompositionResult> {
  const systemPrompt = `You are a task decomposition expert. Analyze the task and return strict JSON only.
{
  "needsDecomposition": true,
  "reason": "why",
  "subTasks": [
    {
      "description": "sub-task description",
      "assignedModel": "gpt-4o|claude|gemini",
      "dependencies": ["task-1"],
      "priority": 1
    }
  ]
}`

  const resultText = await chatFn(model, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Please decompose this task:\n${content}` },
  ])

  try {
    return JSON.parse(resultText) as DecompositionResult
  } catch {
    const analysis = analyzeTask(content)
    return decomposeTask(content, analysis)
  }
}
