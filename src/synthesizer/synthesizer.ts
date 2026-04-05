/**
 * Synthesizer — 多模型结果聚合
 */

export interface SynthesisInput {
  subTaskId: string
  model: string
  content: string
  success: boolean
  error?: string
}

export interface SynthesisResult {
  finalContent: string
  sources: { model: string; length: number }[]
  qualityScore: number  // 0-1
  warnings: string[]
}

/**
 * 简单拼接合成（Phase 1）
 * 后续升级为 LLM 驱动的智能合成
 */
export function synthesizeSimple(inputs: SynthesisInput[]): SynthesisResult {
  const successful = inputs.filter(i => i.success)
  const warnings: string[] = []

  if (successful.length === 0) {
    return {
      finalContent: '所有子任务均失败，无法生成结果。',
      sources: [],
      qualityScore: 0,
      warnings: ['No successful completions']
    }
  }

  if (successful.length < inputs.length) {
    warnings.push(`${inputs.length - successful.length} 个子任务失败，已忽略`)
  }

  // 按优先级/顺序拼接
  const sorted = successful.sort((a, b) => {
    // 按 subTaskId 排序（假设 task-1, task-2 ... 的顺序）
    return a.subTaskId.localeCompare(b.subTaskId)
  })

  // 检测内容重复
  const contents = sorted.map(s => s.content)
  const deduplicated = deduplicateContents(contents)
  
  if (deduplicated.removed > 0) {
    warnings.push(`发现 ${deduplicated.removed} 处重复内容，已自动去重`)
  }

  const finalContent = deduplicated.text

  return {
    finalContent,
    sources: sorted.map(s => ({
      model: s.model,
      length: s.content.length
    })),
    qualityScore: calculateQualityScore(successful),
    warnings
  }
}

/**
 * 检测并去除重复段落
 */
function deduplicateContents(contents: string[]): { text: string; removed: number } {
  const lines: string[] = []
  let removed = 0
  const seen = new Set<string>()

  for (const content of contents) {
    const contentLines = content.split('\n').filter(l => l.trim())
    for (const line of contentLines) {
      const normalized = line.trim().toLowerCase()
      if (!seen.has(normalized) && normalized.length > 10) {
        seen.add(normalized)
        lines.push(line)
      } else {
        removed++
      }
    }
  }

  return { text: lines.join('\n'), removed }
}

/**
 * 简单质量评分
 */
function calculateQualityScore(successful: SynthesisInput[]): number {
  let score = 0.5  // 基础分

  // 内容丰富度
  const avgLength = successful.reduce((sum, s) => sum + s.content.length, 0) / successful.length
  if (avgLength > 500) score += 0.2
  else if (avgLength > 200) score += 0.1

  // 多模型加成
  const uniqueModels = new Set(successful.map(s => s.model))
  if (uniqueModels.size > 1) score += 0.15

  // 代码任务有完整结构
  const hasStructure = successful.some(s => 
    s.content.includes('function') || 
    s.content.includes('def ') || 
    s.content.includes('class ') ||
    s.content.includes('{')
  )
  if (hasStructure) score += 0.1

  return Math.min(score, 1.0)
}

// Phase 2: LLM 驱动的智能合成（预留）
export async function synthesizeWithLLM(
  inputs: SynthesisInput[],
  chatFn: (model: string, messages: {role: string; content: string}[]) => Promise<string>
): Promise<SynthesisResult> {
  if (inputs.length === 0) {
    return {
      finalContent: '没有可合成的结果。',
      sources: [],
      qualityScore: 0,
      warnings: ['No inputs provided']
    }
  }

  if (inputs.length === 1) {
    return {
      finalContent: inputs[0].content,
      sources: [{ model: inputs[0].model, length: inputs[0].content.length }],
      qualityScore: 0.8,
      warnings: []
    }
  }

  const systemPrompt = `你是一个内容合成专家。将多个子任务的输出合并为一个连贯、完整的最终答案。

要求：
1. 去除重复内容
2. 保持逻辑连贯
3. 保持格式一致（代码风格统一）
4. 在适当位置标注信息来源（可选）

输出格式：
{
  "finalContent": "合成的完整内容",
  "qualityScore": 0-1的质量评分,
  "warnings": ["任何警告信息"]
}`

  const combinedInput = inputs.map((i, idx) => 
    `[子任务 ${idx + 1} | 模型: ${i.model}]\n${i.content}`
  ).join('\n\n---\n\n')

  const resultText = await chatFn('kimi', [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请合成以下子任务结果：\n\n${combinedInput}` }
  ])

  try {
    const parsed = JSON.parse(resultText)
    return {
      ...parsed,
      sources: inputs.filter(i => i.success).map(s => ({
        model: s.model,
        length: s.content.length
      }))
    }
  } catch {
    // LLM 合成失败，降级到简单拼接
    return synthesizeSimple(inputs)
  }
}
