/**
 * Config Loader — 加载 YAML 配置
 */

import { readFileSync } from 'fs'
import { parse } from 'yaml'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export interface ModelRoutingConfig {
  keywords: string[]
  score: number
}

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'custom'
  model: string
  max_tokens?: number
  temperature?: number
  routing?: ModelRoutingConfig
}

export interface AppConfig {
  models: Record<string, ModelConfig>
  defaults: {
    timeout_ms: number
    max_retries: number
    default_model: string
    enable_decomposition: boolean
    decomposition_threshold: 'low' | 'medium' | 'high'
  }
}

let cachedConfig: AppConfig | null = null

export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig

  const configPath = join(__dirname, 'models.yaml')
  
  try {
    const fileContent = readFileSync(configPath, 'utf8')
    cachedConfig = parse(fileContent) as AppConfig
    return cachedConfig!
  } catch (error) {
    console.warn(`Failed to load config from ${configPath}, using defaults`)
    return getDefaultConfig()
  }
}

function getDefaultConfig(): AppConfig {
  return {
    models: {},
    defaults: {
      timeout_ms: 60000,
      max_retries: 2,
      default_model: 'gpt-4o',
      enable_decomposition: true,
      decomposition_threshold: 'high'
    }
  }
}

export function getModelConfig(name: string): ModelConfig | undefined {
  const config = loadConfig()
  return config.models[name]
}

export function getDefaultModel(): string {
  const config = loadConfig()
  return config.defaults.default_model
}
