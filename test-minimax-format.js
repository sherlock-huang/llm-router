import 'dotenv/config';
import axios from 'axios';

const apiKey = process.env.MINIMAX_API_KEY;

async function test() {
  const response = await axios.post(
    'https://api.minimaxi.com/anthropic/v1/messages',
    {
      model: 'MiniMax-M2.7',
      messages: [
        { role: 'user', content: 'Output JSON: {"taskType":"code","primaryModel":"kimi","confidence":0.8,"needsDecomposition":true,"complexity":"high","reasoning":"test"}' }
      ],
      max_tokens: 200,
      temperature: 0.3
    },
    {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      }
    }
  );
  
  console.log('Full response:');
  console.log(JSON.stringify(response.data, null, 2));
  
  console.log('\nContent type:', typeof response.data.content);
  console.log('Content is array?:', Array.isArray(response.data.content));
  if (Array.isArray(response.data.content)) {
    console.log('Content[0] type:', response.data.content[0]?.type);
    console.log('Content[0] text:', response.data.content[0]?.text);
    console.log('Content[0] thinking:', response.data.content[0]?.thinking?.substring(0, 100));
  }
}

test();
