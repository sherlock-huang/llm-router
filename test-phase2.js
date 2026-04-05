const resp = await fetch('http://localhost:3000/v1/route/llm', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'help me write a user registration function with frontend and backend' })
});
const data = await resp.json();
console.log(JSON.stringify(data, null, 2));
