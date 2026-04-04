/**
 * 路由核心单元测试
 */

import { describe, it, expect } from 'vitest'
import { route, routeMultipleModels, TASK_TYPES, type TaskType } from '../src/router/rule_based_router.js'

describe('RuleBasedRouter', () => {
  describe('route()', () => {
    it('should route code tasks to gpt-4o', () => {
      const result = route('帮我写一个Python快速排序')
      expect(result.model).toBe('gpt-4o')
      expect(result.type).toBe('code')
    })

    it('should route analysis tasks to claude', () => {
      const result = route('请解释什么是依赖注入')
      expect(result.model).toBe('claude')
      expect(result.type).toBe('analysis')
    })

    it('should route creative writing to gpt-4o', () => {
      const result = route('帮我写一个创意文案')
      expect(result.model).toBe('gpt-4o')
      expect(result.type).toBe('creative')
    })

    it('should route summary tasks to claude', () => {
      const result = route('总结一下这篇长文章的主要内容')
      expect(result.model).toBe('claude')
      expect(result.type).toBe('summary')
    })

    it('should route search tasks to gemini', () => {
      const result = route('今天有什么最新新闻')
      expect(result.model).toBe('gemini')
      expect(result.type).toBe('search')
    })

    it('should handle mixed keywords correctly', () => {
      const result = route('写一个解释微服务的代码')
      // Both code and analysis keywords present, but code usually wins by order/weight
      expect(['gpt-4o', 'claude']).toContain(result.model)
    })

    it('should return default model for unknown tasks', () => {
      const result = route('谢谢你')
      expect(result.model).toBe('gpt-4o')  // default
      expect(result.type).toBe('general')
    })
  })

  describe('routeMultipleModels()', () => {
    it('should return multiple candidate models', () => {
      const result = routeMultipleModels('帮我写代码并解释这段代码的含义')
      expect(result.length).toBeGreaterThanOrEqual(1)
      const models = result.map(r => r.model)
      expect(models).toContain('gpt-4o')
    })

    it('should deduplicate models', () => {
      const result = routeMultipleModels('python代码', 5)
      const models = result.map(r => r.model)
      const unique = new Set(models)
      expect(unique.size).toBe(models.length)
    })

    it('should respect topN parameter', () => {
      const result = routeMultipleModels('python代码 javascript代码', 2)
      expect(result.length).toBeLessThanOrEqual(2)
    })
  })

  describe('TASK_TYPES', () => {
    it('should contain all expected task types', () => {
      const expected: TaskType[] = ['code', 'creative', 'analysis', 'reasoning', 'search', 'summary', 'vision', 'general']
      expected.forEach(type => {
        expect(TASK_TYPES).toContain(type)
      })
    })
  })
})

describe('Routing confidence', () => {
  it('should assign higher confidence to matched keywords', () => {
    const single = route('快速排序')
    const withContext = route('帮我写一个快速排序算法代码')

    expect(withContext.confidence).toBeGreaterThan(single.confidence)
  })
})
