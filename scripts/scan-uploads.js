const fs = require('fs');
const path = require('path');

function scanDir(dir, results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        scanDir(fullPath, results);
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (
          line.includes('type="file"') ||
          line.includes('Camera') ||
          line.includes('ถ่ายภาพ') ||
          line.includes('แนบรูป') ||
          line.includes('จำลองถ่าย') ||
          line.includes('CustomerPhoto') ||
          line.includes('idCardPhoto') ||
          line.includes('slipUrl') ||
          line.includes('photoUrl')
        ) {
          results.push({ file: fullPath, line: index + 1, text: line.trim() });
        }
      });
    }
  }
  return results;
}

const hits = scanDir('src');
console.log(`Found ${hits.length} occurrences:`);
const filesMap = {};
for (const h of hits) {
  filesMap[h.file] = filesMap[h.file] || [];
  filesMap[h.file].push(`${h.line}: ${h.text}`);
}

for (const [file, items] of Object.entries(filesMap)) {
  console.log(`\n=== ${file} (${items.length} items) ===`);
  items.slice(0, 10).forEach(i => console.log('  ' + i));
  if (items.length > 10) console.log(`  ... and ${items.length - 10} more`);
}
