import 'dotenv/config';
import axios from 'axios';

const apiKey = process.env.ARK_API_KEY;

async function testArk() {
  console.log('Testing Ark with different models...');
  
  // Ark 可能用的模型名
  const models = ['doubao-pro', 'doubao-pro-32k', 'doubao-pro-4k', 'ark-code', 'volc-engine'];
  
  for (const model of models) {
    try {
      const response = await axios.post(
        'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
        {
          model: model,
          messages: [{ role: 'user', content: 'say hi' }],
          max_tokens: 10
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
      console.log(`✅ ${model}:`, JSON.stringify(response.data).substring(0, 150));
    } catch (error) {
      const msg = error.response?.data?.message || error.message;
      console.log(`❌ ${model}: ${msg}`);
    }
  }
}

testArk();
