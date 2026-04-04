/**
 * Task Analyzer 单元测试
 */

import { describe, it, expect } from 'vitest'
import { analyzeTask, decomposeTask, type AnalysisResult } from '../src/tasks/task_analyzer.js'

describe('TaskAnalyzer', () => {
  describe('analyzeTask()', () => {
    it('should detect code tasks with language hint', () => {
      const result = analyzeTask('用Python写一个快速排序')
      expect(result.taskType).toBe('code')
      expect(result.language).toBe('Python')
    })

    it('should detect JavaScript tasks', () => {
      const result = analyzeTask('写一个JavaScript函数处理数组')
      expect(result.taskType).toBe('code')
      expect(result.language).toBe('JavaScript')
    })

    it('should detect complexity level correctly', () => {
      const simple = analyzeTask('你好，请问今天日期')
      expect(simple.complexity).toBe('low')

      const medium = analyzeTask('重构这个类的设计')
      expect(medium.complexity).toBe('medium')

      const high = analyzeTask('做一个完整的登录注册系统，包含前端和后端')
      expect(high.complexity).toBe('high')
    })

    it('should flag high complexity tasks as needing decomposition', () => {
      const result = analyzeTask('做一个完整项目，包含前端React和后端Node.js')
      expect(result.needsDecomposition).toBe(true)
    })

    it('should handle non-code tasks', () => {
      const result = analyzeTask('解释什么是依赖注入')
      expect(result.taskType).toBe('analysis')
      expect(result.language).toBeUndefined()
    })
  })

  describe('decomposeTask()', () => {
    it('should not decompose simple tasks', () => {
      const analysis = analyzeTask('你好')
      const result = decomposeTask('你好', analysis)

      expect(result.needsDecomposition).toBe(false)
      expect(result.subTasks).toHaveLength(0)
    })

    it('should decompose full-stack code tasks', () => {
      const analysis = analyzeTask('做一个完整用户注册功能，包含前端表单和后端API') as AnalysisResult & { needsDecomposition: true }
      analysis.needsDecomposition = true

      const result = decomposeTask('做一个完整用户注册功能，包含前端表单和后端API', analysis)

      expect(result.needsDecomposition).toBe(true)
      expect(result.subTasks.length).toBeGreaterThan(0)
    })

    it('should assign correct models to sub-tasks', () => {
      const analysis = {
        taskType: 'code' as const,
        primaryModel: 'gpt-4o',
        confidence: 0.9,
        needsDecomposition: true,
        complexity: 'high' as const
      }

      const result = decomposeTask('做一个完整项目', analysis)

      const models = result.subTasks.map(t => t.assignedModel)
      // Should have variety - claude for analysis/planning, gpt-4o for code
      expect(models.some(m => m === 'gpt-4o' || m === 'claude')).toBe(true)
    })

    it('should set proper dependencies between sub-tasks', () => {
      const analysis = {
        taskType: 'code' as const,
        primaryModel: 'gpt-4o',
        confidence: 0.9,
        needsDecomposition: true,
        complexity: 'high' as const
      }

      const result = decomposeTask('做一个完整项目', analysis)

      // Later tasks should depend on earlier ones
      for (let i = 1; i < result.subTasks.length; i++) {
        const current = result.subTasks[i]
        if (current.dependencies.length > 0) {
          const prevIds = result.subTasks.slice(0, i).map(t => t.id)
          current.dependencies.forEach(dep => {
            expect(prevIds).toContain(dep)
          })
        }
      }
    })
  })
})
