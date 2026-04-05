import 'dotenv/config';
import axios from 'axios';

const apiKey = process.env.ARK_API_KEY;

async function testArk() {
  console.log('Testing Ark endpoints...');
  
  const endpoints = [
    'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    'https://ark.cn-beijing.volces.com/api/v1/chat/completions',
    'https://ark.cn-shanghai.volces.com/api/v3/chat/completions',
    'https://ark.cn-shanghai.volces.com/api/v1/chat/completions',
    'https://ark-console.volces.com/api/v3/chat/completions',
    'https://ark.console.volces.com/api/v3/chat/completions',
  ];
  
  const model = 'volcengine-plan/ark-code-latest';
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.post(
        endpoint,
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
      console.log(`✅ ${endpoint}:`, JSON.stringify(response.data).substring(0, 100));
    } catch (error) {
      const msg = error.response?.data?.message || error.response?.status || error.message;
      console.log(`❌ ${endpoint.split('/')[2]}: ${msg}`);
    }
  }
}

testArk();
