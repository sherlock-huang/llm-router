import 'dotenv/config';
import axios from 'axios';

async function testKimi() {
  console.log('=== Testing KIMI ===');
  const apiKey = process.env.MOONSHOT_API_KEY;
  
  try {
    const response = await axios.post(
      'https://api.kimi.com/coding/v1/chat/completions',
      {
        model: 'kimi-for-coding/k2p5',
        messages: [{ role: 'user', content: 'say hi in 3 words' }],
        max_tokens: 20
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    console.log('✅ KIMI Success:', JSON.stringify(response.data).substring(0, 200));
  } catch (error) {
    console.log('❌ KIMI Error:', JSON.stringify(error.response?.data?.error || error.message));
  }
}

async function testArk() {
  console.log('\n=== Testing Ark ===');
  const apiKey = process.env.ARK_API_KEY;
  
  try {
    const response = await axios.post(
      'https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions',
      {
        model: 'doubao-seed-2.0-code',
        messages: [{ role: 'user', content: 'say hi in 3 words' }],
        max_tokens: 20
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    console.log('✅ Ark Success:', JSON.stringify(response.data).substring(0, 200));
  } catch (error) {
    console.log('❌ Ark Error:', JSON.stringify(error.response?.data?.error || error.response?.data));
  }
}

await testKimi();
await testArk();
