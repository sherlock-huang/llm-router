import { describe, expect, it } from 'vitest'
import { TASK_TYPES, route, routeMultipleModels, type TaskType } from '../src/router/rule_based_router.js'

describe('RuleBasedRouter', () => {
  describe('route()', () => {
    it('routes code tasks to ark', () => {
      const result = route('Write a Python quicksort function')
      expect(result.model).toBe('ark')
      expect(result.type).toBe('code')
    })

    it('routes analysis tasks to minimax', () => {
      const result = route('Explain dependency injection and compare it with service locator')
      expect(result.model).toBe('minimax')
      expect(result.type).toBe('analysis')
    })

    it('routes creative tasks to minimax', () => {
      const result = route('Write a creative product launch headline')
      expect(result.model).toBe('minimax')
      expect(result.type).toBe('creative')
    })

    it('routes summary tasks to minimax', () => {
      const result = route('Summarize the main points of this long article')
      expect(result.model).toBe('minimax')
      expect(result.type).toBe('summary')
    })

    it('routes news-like prompts to stepfun', () => {
      const result = route('What happened in AI news today?')
      expect(result.model).toBe('stepfun')
      expect(result.type).toBe('search')
    })

    it('returns the default model for unmatched tasks', () => {
      const result = route('Thanks')
      expect(result.model).toBe('minimax')
      expect(result.type).toBe('general')
    })
  })

  describe('routeMultipleModels()', () => {
    it('returns candidate models', () => {
      const result = routeMultipleModels('Write code and explain what the code is doing')
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result.map((r) => r.model)).toContain('ark')
    })

    it('deduplicates models', () => {
      const result = routeMultipleModels('python code javascript code', 5)
      const models = result.map((r) => r.model)
      expect(new Set(models).size).toBe(models.length)
    })

    it('respects topN', () => {
      const result = routeMultipleModels('python code javascript code', 2)
      expect(result.length).toBeLessThanOrEqual(2)
    })
  })

  describe('TASK_TYPES', () => {
    it('contains all expected task types', () => {
      const expected: TaskType[] = ['code', 'creative', 'analysis', 'reasoning', 'search', 'summary', 'vision', 'general']
      expected.forEach((type) => {
        expect(TASK_TYPES).toContain(type)
      })
    })
  })
})

describe('Routing confidence', () => {
  it('assigns higher or equal confidence when a better keyword match exists', () => {
    const single = route('quicksort')
    const withContext = route('Write a Python quicksort function')
    expect(withContext.confidence).toBeGreaterThanOrEqual(single.confidence)
  })
})
