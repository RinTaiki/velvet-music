const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
function check(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', '.expo', '.npm-cache', '.tmp', 'assets'].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) check(file);
    else if (/\.(js|cjs)$/.test(file)) { parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'unambiguous', plugins: ['jsx'] }); console.log(`Parsed ${file}`); }
    else if (entry.name.endsWith('.json')) { JSON.parse(fs.readFileSync(file, 'utf8')); console.log(`Validated ${file}`); }
  }
}
check('.');
