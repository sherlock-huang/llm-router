import 'dotenv/config';
import axios from 'axios';

async function testKimi() {
  console.log('=== Testing KIMI ===');
  const apiKey = process.env.MOONSHOT_API_KEY;
  console.log('Key:', apiKey?.substring(0, 15) + '...');
  
  try {
    // KIMI Code Plan 可能用不同的 endpoint
    const response = await axios.post(
      'https://api.moonshot.cn/v1/chat/completions',
      {
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: 'say hi' }],
        max_tokens: 10
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

async function testMinimax() {
  console.log('\n=== Testing Minimax ===');
  const apiKey = process.env.MINIMAX_API_KEY;
  console.log('Key:', apiKey?.substring(0, 15) + '...');
  
  try {
    const response = await axios.post(
      'https://api.minimaxi.com/anthropic/v1/messages',
      {
        model: 'MiniMax-M2.7',
        messages: [{ role: 'user', content: 'say hi' }],
        max_tokens: 10
      },
      {
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 10000
      }
    );
    console.log('✅ Minimax Success:', JSON.stringify(response.data).substring(0, 200));
  } catch (error) {
    console.log('❌ Minimax Error:', JSON.stringify(error.response?.data?.error || error.message));
  }
}

async function testArk() {
  console.log('\n=== Testing Ark ===');
  const apiKey = process.env.ARK_API_KEY;
  console.log('Key:', apiKey?.substring(0, 15) + '...');
  
  try {
    const response = await axios.post(
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      {
        model: 'doubao-pro',
        messages: [{ role: 'user', content: 'say hi' }],
        max_tokens: 10
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
    console.log('❌ Ark Error:', JSON.stringify(error.response?.data?.error || error.message));
  }
}

await testKimi();
await testMinimax();
await testArk();
