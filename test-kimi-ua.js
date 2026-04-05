import 'dotenv/config';
import axios from 'axios';

const apiKey = process.env.MOONSHOT_API_KEY;

async function testKimi() {
  console.log('Testing KIMI with various User-Agent headers...');
  
  const userAgents = [
    'Mozilla/5.0 (compatible; Kimi-Coding-Agent/1.0)',
    'Kimi-Code/1.0',
    'Claude-Code/1.0',
    'OpenClaw/2026.4.2',
    'curl/8.0.0',
  ];
  
  const model = 'kimi-for-coding/k2p5';
  
  for (const ua of userAgents) {
    try {
      const response = await axios.post(
        'https://api.kimi.com/coding/v1/chat/completions',
        {
          model: model,
          messages: [{ role: 'user', content: 'say hi in 3 words' }],
          max_tokens: 20
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': ua
          },
          timeout: 5000
        }
      );
      console.log(`✅ ${ua}:`, JSON.stringify(response.data).substring(0, 100));
      return;
    } catch (error) {
      const msg = error.response?.data?.error?.message || error.message;
      console.log(`❌ ${ua}: ${msg.substring(0, 80)}`);
    }
  }
}

testKimi();
