import { describe, expect, it } from 'vitest'
import { analyzeTask, decomposeTask, type AnalysisResult } from '../src/tasks/task_analyzer.js'

describe('TaskAnalyzer', () => {
  describe('analyzeTask()', () => {
    it('detects code tasks with language hints', () => {
      const result = analyzeTask('Write a Python quicksort function')
      expect(result.taskType).toBe('code')
      expect(result.language).toBe('Python')
    })

    it('detects JavaScript tasks', () => {
      const result = analyzeTask('Write a JavaScript function to transform an array')
      expect(result.taskType).toBe('code')
      expect(result.language).toBe('JavaScript')
    })

    it('detects complexity levels', () => {
      const simple = analyzeTask('Hello')
      expect(simple.complexity).toBe('low')

      const medium = analyzeTask('Refactor this class design')
      expect(medium.complexity).toBe('medium')

      const high = analyzeTask('Build a complete login and registration system with frontend and backend')
      expect(high.complexity).toBe('high')
    })

    it('flags high-complexity tasks for decomposition', () => {
      const result = analyzeTask('Build a complete project with React frontend and Node.js backend')
      expect(result.needsDecomposition).toBe(true)
    })

    it('handles non-code tasks', () => {
      const result = analyzeTask('Explain dependency injection')
      expect(result.taskType).toBe('analysis')
      expect(result.language).toBeUndefined()
    })
  })

  describe('decomposeTask()', () => {
    it('does not decompose simple tasks', () => {
      const analysis = analyzeTask('Hello')
      const result = decomposeTask('Hello', analysis)
      expect(result.needsDecomposition).toBe(false)
      expect(result.subTasks).toHaveLength(0)
    })

    it('decomposes full-stack code tasks', () => {
      const analysis = analyzeTask('Build a complete registration feature with frontend forms and backend API') as AnalysisResult & {
        needsDecomposition: true
      }
      analysis.needsDecomposition = true

      const result = decomposeTask('Build a complete registration feature with frontend forms and backend API', analysis)
      expect(result.needsDecomposition).toBe(true)
      expect(result.subTasks.length).toBeGreaterThan(0)
    })

    it('assigns practical models to subtasks', () => {
      const analysis = {
        taskType: 'code' as const,
        primaryModel: 'ark',
        confidence: 0.9,
        needsDecomposition: true,
        complexity: 'high' as const,
      }

      const result = decomposeTask('Build a complete project', analysis)
      const models = result.subTasks.map((task) => task.assignedModel)
      expect(models.some((model) => model === 'ark' || model === 'minimax')).toBe(true)
    })

    it('keeps dependencies pointed at earlier subtasks', () => {
      const analysis = {
        taskType: 'code' as const,
        primaryModel: 'ark',
        confidence: 0.9,
        needsDecomposition: true,
        complexity: 'high' as const,
      }

      const result = decomposeTask('Build a complete project', analysis)

      for (let i = 1; i < result.subTasks.length; i += 1) {
        const current = result.subTasks[i]
        if (current.dependencies.length > 0) {
          const prevIds = result.subTasks.slice(0, i).map((task) => task.id)
          current.dependencies.forEach((dep) => {
            expect(prevIds).toContain(dep)
          })
        }
      }
    })
  })
})
