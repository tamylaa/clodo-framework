import fs from 'fs';
const content = fs.readFileSync('src/service-management/GenerationEngine.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('bin/')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});