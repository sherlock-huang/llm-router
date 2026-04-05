import 'dotenv/config';
import axios from 'axios';

const apiKey = process.env.MOONSHOT_API_KEY;

async function test() {
  console.log('Testing Moonshot API...');
  console.log('Key prefix:', apiKey.substring(0, 10) + '...');
  
  try {
    const response = await axios.post(
      'https://api.moonshot.cn/v1/chat/completions',
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
    console.log('Success:', JSON.stringify(response.data));
  } catch (error) {
    console.log('Error:', JSON.stringify(error.response?.data || error.message));
  }
}

test();
