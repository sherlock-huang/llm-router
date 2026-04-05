import 'dotenv/config';
import axios from 'axios';

const apiKey = process.env.MOONSHOT_API_KEY;
const baseUrl = 'https://api.moonshot.cn/v1';

async function test() {
  console.log('Testing Moonshot API...');
  console.log('API Key set:', !!apiKey);
  
  try {
    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: 'moonshot-v1-8k',
        messages: [
          { role: 'user', content: 'Say hello in one word' }
        ],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('Success:', response.data);
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
}

test();
