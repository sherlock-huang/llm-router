/**
 * LiteLLM Gateway
 * 统一封装所有模型的调用接口
 */

import axios from 'axios'

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'moonshot' | 'bytedance' | 'minimax' | 'ollama' | 'custom'
  model: string
  apiKey?: string
  baseUrl?: string
  maxTokens?: number
  temperature?: number
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  maxTokens?: number
}

export interface ChatCompletionResponse {
  model: string
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: string
}

// 模型配置注册表
const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'kimi': {
    provider: 'moonshot',
    model: 'kimi-for-coding/k2p5',
    baseUrl: 'https://api.kimi.com/coding/v1',
    maxTokens: 4096,
    temperature: 0.7
  },
  'minimax': {
    provider: 'minimax',
    model: 'MiniMax-M2.7',
    baseUrl: 'https://api.minimaxi.com/anthropic/v1',
    maxTokens: 4096,
    temperature: 0.7
  },
  'ark': {
    provider: 'bytedance',
    model: 'doubao-seed-2.0-code',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v3',
    maxTokens: 4096,
    temperature: 0.7
  }
}

function getApiKey(provider: string): string | undefined {
  const envMap: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GEMINI_API_KEY',
    moonshot: 'MOONSHOT_API_KEY',
    bytedance: 'ARK_API_KEY',
    minimax: 'MINIMAX_API_KEY'
  }
  const envKey = envMap[provider]
  if (envKey) {
    // 从环境变量读取（Node.js）
    return process.env[envKey]
  }
  return undefined
}

export async function chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  const config = MODEL_REGISTRY[request.model] ?? {
    provider: 'openai',
    model: request.model,
    baseUrl: 'https://api.openai.com/v1'
  }

  const apiKey = getApiKey(config.provider) || config.apiKey

  if (config.provider === 'openai' || config.provider === 'moonshot' || config.provider === 'bytedance') {
    return callOpenAI(config, request, apiKey)
  } else if (config.provider === 'anthropic' || config.provider === 'minimax') {
    return callAnthropic(config, request, apiKey)
  } else if (config.provider === 'google') {
    return callGoogle(config, request, apiKey)
  } else {
    throw new Error(`Unsupported provider: ${config.provider}`)
  }
}

async function callOpenAI(config: ModelConfig, request: ChatCompletionRequest, apiKey?: string): Promise<ChatCompletionResponse> {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not set')
  }

  const response = await axios.post(
    `${config.baseUrl}/chat/completions`,
    {
      model: config.model,
      messages: request.messages,
      stream: false,
      temperature: request.temperature ?? config.temperature,
      max_tokens: request.maxTokens ?? config.maxTokens
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  )

  const data = response.data
  return {
    model: data.model,
    content: data.choices?.[0]?.message?.content ?? '',
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens
    } : undefined,
    finishReason: data.choices?.[0]?.finish_reason
  }
}

async function callAnthropic(config: ModelConfig, request: ChatCompletionRequest, apiKey?: string): Promise<ChatCompletionResponse> {
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  // Anthropic uses a different message format
  const systemMsg = request.messages.find(m => m.role === 'system')?.content ?? ''
  const userMsgs = request.messages.filter(m => m.role !== 'system')

  const response = await axios.post(
    `${config.baseUrl}/messages`,
    {
      model: config.model,
      messages: userMsgs.map(m => ({ role: m.role, content: m.content })),
      system: systemMsg || undefined,
      max_tokens: request.maxTokens ?? config.maxTokens ?? 1024,
      temperature: request.temperature ?? config.temperature
    },
    {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    }
  )

  const data = response.data
  // 处理 Minimax/Anthropic 格式: content 可能是数组
  let text = ''
  if (Array.isArray(data.content)) {
    // 找到 type="text" 的元素
    const textBlock = data.content.find((c: any) => c.type === 'text')
    text = textBlock?.text ?? ''
  } else {
    text = data.content ?? ''
  }
  return {
    model: config.model,
    content: text,
    usage: data.usage ? {
      promptTokens: data.usage.input_tokens,
      completionTokens: data.usage.output_tokens,
      totalTokens: data.usage.input_tokens + data.usage.output_tokens
    } : undefined,
    finishReason: data.stop_reason
  }
}

async function callGoogle(config: ModelConfig, request: ChatCompletionRequest, apiKey?: string): Promise<ChatCompletionResponse> {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set')
  }

  const contents = request.messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  const response = await axios.post(
    `${config.baseUrl}/models/${config.model}:generateContent?key=${apiKey}`,
    {
      contents,
      generationConfig: {
        temperature: request.temperature ?? config.temperature,
        maxOutputTokens: request.maxTokens ?? config.maxTokens
      }
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )

  const data = response.data
  return {
    model: config.model,
    content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
    usage: data.usageMetadata ? {
      promptTokens: data.usageMetadata.promptTokenCount,
      completionTokens: data.usageMetadata.candidatesTokenCount,
      totalTokens: data.usageMetadata.totalTokenCount
    } : undefined
  }
}

export function listAvailableModels(): { name: string; config: ModelConfig }[] {
  return Object.entries(MODEL_REGISTRY).map(([name, config]) => ({
    name,
    config
  }))
}

export function registerModel(name: string, config: ModelConfig): void {
  MODEL_REGISTRY[name] = config
}
