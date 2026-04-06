/**
 * 规则路由核心
 * RuleBasedRouter — 根据任务类型关键词匹配最佳模型
 */

export type TaskType = 
  | 'code'        // 代码生成/调试
  | 'creative'    // 创意写作
  | 'analysis'   // 分析/问答
  | 'reasoning'  // 数学/推理
  | 'search'     // 搜索增强
  | 'summary'    // 总结摘要
  | 'vision'     // 图像相关
  | 'general'    // 通用

export interface RoutingRule {
  type: TaskType
  keywords: string[]
  model: string
  score?: number
}

export interface RoutingResult {
  type: TaskType
  model: string
  confidence: number
  reason: string
}

const DEFAULT_MODEL = 'minimax'

const ROUTING_RULES: RoutingRule[] = [
  {
    type: 'code',
    keywords: ['代码', '写代码', 'function', 'def ', 'class ', 'import ', 'debug', 'bug', '算法', '编程', 'python', 'javascript', 'java', 'rust', 'sql', 'api', '接口', 'stepfun'],
    model: 'ark',
    score: 0.95
  },
  {
    type: 'creative',
    keywords: ['写故事', '写诗', '创意', '文案', '写文章', '小说', '剧本', '歌词', '广告语', '品牌名'],
    model: 'gpt-4o',
    score: 0.85
  },
  {
    type: 'analysis',
    keywords: ['解释', '分析', '为什么', '什么是', '怎么样', '比较', '对比', '区别', '优缺点', '评估', '判断'],
    model: 'claude',
    score: 0.85
  },
  {
    type: 'reasoning',
    keywords: ['计算', '推理', '证明', '数学', '逻辑', '推导', '求解', '方程'],
    model: 'gpt-4o',
    score: 0.8
  },
  {
    type: 'search',
    keywords: ['最新', '实时', '查一下', '新闻', '今天', '现在', '最近发生了'],
    model: 'gemini',
    score: 0.75
  },
  {
    type: 'summary',
    keywords: ['总结', '摘要', '概括', '提炼', '核心观点', '主要信息'],
    model: 'claude',
    score: 0.85
  },
  {
    type: 'vision',
    keywords: ['画', '图', '设计', '图片', '图像', '视觉', '生成图片'],
    model: 'gpt-4o',
    score: 0.8
  }
]

function classifyByKeywords(text: string): { type: TaskType; score: number; model: string; matchedKeyword: string } {
  const lower = text.toLowerCase()
  
  let bestMatch = {
    type: 'general' as TaskType,
    score: 0,
    model: DEFAULT_MODEL,
    matchedKeyword: ''
  }

  for (const rule of ROUTING_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        const score = (rule.score ?? 0.8) + Math.random() * 0.05 // 小抖动避免完全相同
        if (score > bestMatch.score) {
          bestMatch = {
            type: rule.type,
            score,
            model: rule.model,
            matchedKeyword: keyword
          }
        }
      }
    }
  }

  return bestMatch
}

export function route(content: string): RoutingResult {
  const match = classifyByKeywords(content)
  
  if (match.score === 0) {
    return {
      type: 'general',
      model: DEFAULT_MODEL,
      confidence: 0.5,
      reason: '未匹配到特定规则，使用默认模型'
    }
  }

  return {
    type: match.type,
    model: match.model,
    confidence: match.score,
    reason: `匹配到关键词 [${match.matchedKeyword}]，类型判定为 ${match.type}`
  }
}

export function routeMultipleModels(content: string, topN = 2): RoutingResult[] {
  const lower = content.toLowerCase()
  const scores: { rule: RoutingRule; score: number }[] = []

  for (const rule of ROUTING_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword.toLowerCase())) {
        const score = rule.score ?? 0.8
        scores.push({ rule, score })
      }
    }
  }

  // 按分数排序，取topN
  scores.sort((a, b) => b.score - a.score)
  const top = scores.slice(0, topN)

  // 去重
  const seen = new Set<string>()
  const unique: RoutingResult[] = []
  for (const { rule, score } of top) {
    if (!seen.has(rule.model)) {
      seen.add(rule.model)
      unique.push({
        type: rule.type,
        model: rule.model,
        confidence: score,
        reason: `候选模型 (keyword matched)`
      })
    }
  }

  return unique
}

// 导出所有任务类型
export const TASK_TYPES: TaskType[] = ['code', 'creative', 'analysis', 'reasoning', 'search', 'summary', 'vision', 'general']
