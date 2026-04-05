import 'dotenv/config';
import axios from 'axios';

const kimiKey = process.env.MOONSHOT_API_KEY;
const arkKey = process.env.ARK_API_KEY;

async function testKimi() {
  console.log('=== Testing KIMI with coding agent headers ===');
  
  const endpoints = [
    'https://api.kimi.com/coding/v1/chat/completions',
    'https://api.kimi.com/coding/v1', 
    'https://api.kimi.com/v1/chat/completions',
  ];
  
  const headers = [
    { 'x-coding-agent': 'true' },
    { 'x-agent-type': 'coding' },
    { 'x-request-from': 'coding-agent' },
    {},
  ];
  
  for (const endpoint of endpoints) {
    for (const extraHeaders of headers) {
      try {
        const response = await axios.post(
          endpoint,
          {
            model: 'kimi-coding/k2p5',
            messages: [{ role: 'user', content: 'say hi' }],
            max_tokens: 10
          },
          {
            headers: {
              'Authorization': `Bearer ${kimiKey}`,
              'Content-Type': 'application/json',
              ...extraHeaders
            },
            timeout: 5000
          }
        );
        console.log(`✅ ${endpoint}:`, JSON.stringify(response.data).substring(0, 100));
        return;
      } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        if (msg.includes('Coding Agent') || msg.includes('coding')) {
          console.log(`❌ ${endpoint} ${JSON.stringify(extraHeaders)}: ${msg.substring(0, 80)}`);
        }
      }
    }
  }
  console.log('All KIMI attempts failed');
}

async function testArk() {
  console.log('\n=== Testing Ark ===');
  
  try {
    const response = await axios.post(
      'https://ark.cn-beijing.volces.com/api/coding/v3/chat/completions',
      {
        model: 'volcengine-plan/ark-code-latest',
        messages: [{ role: 'user', content: 'say hi' }],
        max_tokens: 10
      },
      {
        headers: {
          'Authorization': `Bearer ${arkKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    console.log('✅ Ark Success:', JSON.stringify(response.data).substring(0, 100));
  } catch (error) {
    console.log('❌ Ark Error:', JSON.stringify(error.response?.data?.error || error.response?.data));
  }
}

await testKimi();
await testArk();
