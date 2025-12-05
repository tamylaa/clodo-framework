import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerCompatiblePatterns = [
  /fetch\(/,
  /Response\(/,
  /Request/,
  /env\./,
  /ctx\./,
  /export.*default.*{.*fetch/,
  /initializeService/,
  /createFeatureGuard/,
  /COMMON_FEATURES/,
  /createDomainConfigSchema/,
  /validateDomainConfig/,
  /getDomainFromEnv/,
  /createEnvironmentConfig/
];

const nodeOnlyPatterns = [
  /import.*from.*['"]fs['"]/,
  /import.*from.*['"]path['"]/,
  /import.*from.*['"]child_process['"]/,
  /import.*from.*['"]os['"]/,
  /import.*from.*['"]https['"]/,
  /import.*from.*['"]http['"]/,
  /readFileSync|writeFileSync|existsSync|mkdirSync|readdirSync|statSync/,
  /spawn|execSync|exec\(/,
  /process\.cwd\(\)/,
  /__dirname(?!\s*=)/,
  /__filename(?!\s*=)/
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const workerCode = [];
  const nodeCode = [];
  const potentialMixedLines = [];

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) return;

    let hasWorker = false;
    let hasNode = false;

    for (const pattern of workerCompatiblePatterns) {
      if (pattern.test(trimmedLine)) {
        hasWorker = true;
        workerCode.push({ line: lineNum, content: trimmedLine });
        break;
      }
    }

    for (const pattern of nodeOnlyPatterns) {
      if (pattern.test(trimmedLine)) {
        hasNode = true;
        nodeCode.push({ line: lineNum, content: trimmedLine, pattern: pattern.toString() });
        break;
      }
    }

    if (hasWorker && hasNode) {
      potentialMixedLines.push({ line: lineNum, content: trimmedLine });
    }
  });

  return {
    hasWorkerCode: workerCode.length > 0,
    hasNodeCode: nodeCode.length > 0,
    isMixed: workerCode.length > 0 && nodeCode.length > 0,
    workerCodeCount: workerCode.length,
    nodeCodeCount: nodeCode.length,
    workerCode,
    nodeCode,
    potentialMixedLines
  };
}

function scanDirectory(dir, results = []) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath, results);
      } else if (item.endsWith('.js')) {
        const analysis = scanFile(fullPath);
        if (analysis.hasWorkerCode || analysis.hasNodeCode) {
          results.push({
            file: fullPath.replace(process.cwd(), ''),
            ...analysis
          });
        }
      }
    }
  } catch (e) {}
  return results;
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  DEEP ANALYSIS: Worker vs Node.js Code in Framework       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

const results = scanDirectory('src');

// Categorize results
const pureNodeOnly = results.filter(r => !r.hasWorkerCode && r.hasNodeCode);
const pureWorkerCode = results.filter(r => r.hasWorkerCode && !r.hasNodeCode);
const mixedCode = results.filter(r => r.isMixed);

console.log(`📊 OVERALL SUMMARY:`);
console.log(`   Total files analyzed: ${results.length}`);
console.log(`   Pure Node.js only: ${pureNodeOnly.length}`);
console.log(`   Pure Worker code: ${pureWorkerCode.length}`);
console.log(`   MIXED code (both): ${mixedCode.length}\n`);

if (mixedCode.length > 0) {
  console.log(`╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  ⚠️  FILES WITH MIXED CODE (Worker + Node.js)             ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
  
  mixedCode.forEach(file => {
    console.log(`\n📄 ${file.file}`);
    console.log(`   Worker code lines: ${file.workerCodeCount}`);
    console.log(`   Node.js code lines: ${file.nodeCodeCount}`);
    console.log(`   Worker patterns found:`);
    file.workerCode.slice(0, 3).forEach(w => {
      console.log(`     • Line ${w.line}: ${w.content.substring(0, 60)}`);
    });
    console.log(`   Node.js patterns found:`);
    file.nodeCode.slice(0, 3).forEach(n => {
      console.log(`     • Line ${n.line}: ${n.content.substring(0, 60)}`);
    });
  });
}

console.log(`\n╔════════════════════════════════════════════════════════════╗`);
console.log(`║  PURE NODE.JS FILES (No Worker Code)                     ║`);
console.log(`╚════════════════════════════════════════════════════════════╝\n`);

pureNodeOnly.forEach(file => {
  console.log(`${file.file.substring(0, 80)}`);
});

console.log(`\n╔════════════════════════════════════════════════════════════╗`);
console.log(`║  PURE WORKER CODE (No Node.js Dependencies)              ║`);
console.log(`╚════════════════════════════════════════════════════════════╝\n`);

pureWorkerCode.forEach(file => {
  console.log(`${file.file.substring(0, 80)}`);
});

console.log(`\n\n═══════════════════════════════════════════════════════════\n`);
