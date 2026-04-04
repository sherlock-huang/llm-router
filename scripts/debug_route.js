const fs = require('fs');
const c = fs.readFileSync('C:\\Users\\openclaw-windows-2\\.openclaw\\workspace\\llm-router\\src\\router\\rule_based_router.ts', 'utf8');
const idx = c.indexOf('type:');
console.log('Found at:', idx);
// Print around the creative section
const creativeIdx = c.indexOf("'creative'");
console.log('Creative at:', creativeIdx);
if (creativeIdx > 0) {
  console.log(c.substring(creativeIdx - 100, creativeIdx + 400));
}
