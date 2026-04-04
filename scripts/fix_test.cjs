const fs = require('fs');
let c = fs.readFileSync('C:\\Users\\openclaw-windows-2\\.openclaw\\workspace\\llm-router\\tests\\router.test.ts', 'utf8');
// Replace the malformed line
c = c.split("\n").map(line => {
  if (line.includes("just saying hello")) {
    return "      const result = route('谢谢你')";
  }
  return line;
}).join("\n");
fs.writeFileSync('C:\\Users\\openclaw-windows-2\\.openclaw\\workspace\\llm-router\\tests\\router.test.ts', c);
console.log('done');
