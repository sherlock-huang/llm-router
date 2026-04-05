import 'dotenv/config';
import axios from 'axios';

const apiKey = process.env.MINIMAX_API_KEY;

async function testMinimaxLLM() {
  console.log('Testing Minimax for LLM analysis...');
  
  const systemPrompt = `你是一个任务分析专家。分析用户请求并输出结构化的 JSON 决策。

分析维度：
1. task_type: 代码(code)/创意写作(creative)/分析问答(analysis)/数学推理(reasoning)/搜索增强(search)/总结摘要(summary)/图像(vision)/通用(general)
2. primary_model: 推荐模型 (minimax/kimi/ark)
3. confidence: 置信度 0-1
4. complexity: 复杂度 (low/medium/high)
5. needs_decomposition: 是否需要拆解
6. reasoning: 分析理由

输出格式（严格 JSON，不要其他内容）：
{
  "taskType": "code|creative|analysis|reasoning|search|summary|vision|general",
  "primaryModel": "minimax|kimi|ark",
  "confidence": 0.0-1.0,
  "needsDecomposition": true|false,
  "complexity": "low|medium|high",
  "reasoning": "分析理由..."
}`;

  try {
    const response = await axios.post(
      'https://api.minimaxi.com/anthropic/v1/messages',
      {
        model: 'MiniMax-M2.7',
        messages: [
          { role: 'user', content: systemPrompt },
          { role: 'user', content: '请分析以下任务：\n帮我写一个用户注册功能，包括前端和后端' }
        ],
        max_tokens: 500,
        temperature: 0.3
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 30000
      }
    );
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data).substring(0, 500));
  } catch (error) {
    console.log('❌ Error:', JSON.stringify(error.response?.data?.error || error.message));
  }
}

testMinimaxLLM();
