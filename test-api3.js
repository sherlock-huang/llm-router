import 'dotenv/config';
import axios from 'axios';

const apiKey = process.env.MOONSHOT_API_KEY;

async function test() {
  console.log('Testing Moonshot API with different models...');
  
  const models = ['moonshot-v1', 'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'];
  
  for (const model of models) {
    try {
      const response = await axios.post(
        'https://api.moonshot.cn/v1/chat/completions',
        {
          model: model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
      console.log(`✅ ${model}:`, JSON.stringify(response.data).substring(0, 100));
      break;
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      console.log(`❌ ${model}: ${msg}`);
    }
  }
}

test();
