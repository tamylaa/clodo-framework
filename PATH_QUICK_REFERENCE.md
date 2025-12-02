# Quick Reference: Path Management Cheat Sheet

## Golden Rules (MEMORIZE THESE)

```
🚫 NEVER: Edit dist/ files manually
🚫 NEVER: Run "fix" scripts on dist/ output
🚫 NEVER: Commit broken dist/ files
✅ ALWAYS: Edit src/, cli/, lib/ only
✅ ALWAYS: Run npm run build after changes
✅ ALWAYS: Run npm run check:imports
```

---

## Import Path Formula by File Depth

```
DEPTH = How many folders deep the file is in dist/

Depth 0: dist/index.js
         from './lib/...'
         from './utils/...'
         from './simple-api.js'

Depth 1: dist/utils/file.js
         from '../../lib/...'
         from '../../simple-api.js'

Depth 2: dist/cli/commands/create.js
         from '../../lib/...'
         from '../../simple-api.js'
         from '../../service-management/...'

Depth 3: dist/cli/commands/helpers/file.js
         from '../../../lib/...'
         from '../../../utils/...'
```

**FORMULA**: Each level up = 1 `../`. To reach `dist/` root = depth + 1 levels.

---

## If Something Is Wrong: Diagnostic Flowchart

```
Build fails with "Cannot find module"?
├─ YES: Check what file says the error
│   ├─ Error says dist/X.js?
│   │   └─ Fix source file: cli/X.js, src/X.js, or lib/X.js
│   ├─ Run: npm run build
│   └─ Test: npm run check:imports
│
├─ NO: Module imports fail?
│   ├─ Error: require('./dist') fails?
│   │   └─ Run: npm run check:imports (find the problem)
│   ├─ Fix the source file
│   ├─ Run: npm run build
│   └─ Test: node -e "require('./dist')"
│
└─ NO: CLI doesn't work?
    ├─ Run: node dist/cli/clodo-service.js --help
    ├─ If error, check dist/cli files
    ├─ Fix source: cli/ files
    ├─ Run: npm run build
    └─ Test again
```

---

## Common Path Mistakes & Fixes

### ❌ WRONG Examples

```javascript
// In dist/cli/commands/create.js
import { Clodo } from '../../src/simple-api.js';  // ❌ No src/ in dist
import { X } from '../lib/shared/utils/file.js';  // ❌ Only 1 ../, need 2

// In dist/simple-api.js (root level)
import { ConfigManager } from '../lib/config.js';  // ❌ Extra ../, should be ./

// In dist/cli/commands/helpers/file.js
import { X } from '../lib/shared/file.js';         // ❌ Only 2 ../, need 3
```

### ✅ CORRECT Examples

```javascript
// In dist/cli/commands/create.js (depth 2)
import { Clodo } from '../../simple-api.js';      // ✅ Goes up 2 levels
import { X } from '../../lib/shared/utils/file.js'; // ✅ Correct depth

// In dist/simple-api.js (depth 0)
import { ConfigManager } from './lib/config.js';  // ✅ Same level (no ../)

// In dist/cli/commands/helpers/file.js (depth 3)
import { X } from '../../../lib/shared/file.js';  // ✅ Goes up 3 levels
```

---

## Before Making Changes: Pre-Flight Checklist

```
□ Am I editing source, not dist/?
□ Will npm run build succeed?
□ Will npm run check:imports pass?
□ Will CLI work: node dist/cli/clodo-service.js --help?
□ Will module work: node -e "require('./dist/index.js')"?

If ALL ✅, you're good to commit/publish.
```

---

## One-Minute Debug Guide

| Symptom | Check | Fix |
|---------|-------|-----|
| "Cannot find module" | Count `../` in import | Use formula (depth + 1) |
| CLI doesn't work | dist/cli/ imports | Fix cli/ source files |
| Module won't import | Run check:imports | Fix import paths |
| Build fails | Error trace | Find source file, fix it |
| Paths still wrong after npm run build | Check source file not dist/ | Edit src/cli/lib/ files |

---

## The 4-Step Workflow

```
1. EDIT SOURCE
   nano src/utils/file.js
   nano cli/commands/create.js
   nano lib/shared/config/manager.js

2. BUILD
   npm run build

3. VALIDATE
   npm run check:imports

4. TEST
   node dist/cli/clodo-service.js --help
   node -e "require('./dist')"
```

All 4 must succeed.

---

## Path Calculation Made Easy

```
Find your file: dist/cli/commands/helpers/deployment.js

Count slashes after dist/:
  dist / cli / commands / helpers / deployment.js
       1    2     3       4

Depth = 4 - 1 = 3

So use: import { X } from '../../../lib/...'
        (3 dots per depth level, plus one more to reach dist/)
```

---

## Commit Only THESE Files

```bash
✅ DO commit:
   - src/**
   - cli/**
   - lib/**
   - scripts/**
   - package.json
   - tsconfig.json
   - .eslintrc
   - etc.

❌ DON'T commit:
   - dist/
   - node_modules/
   - *.log
   - .DS_Store
```

---

## Testing Checklist After Changes

```bash
# 1. Build
npm run build

# 2. Validate imports
npm run check:imports

# 3. Test CLI
node dist/cli/clodo-service.js --help
node dist/cli/clodo-service.js list-types
node dist/cli/clodo-service.js init-config --help

# 4. Test module
node -e "
  const mod = require('./dist/index.js');
  console.log('✅ Import works');
  console.log('✅ Exports:', Object.keys(mod).length);
"

# 5. All pass?
echo "✅ READY TO PUBLISH"
```

---

## When CI/CD Fails: Root Causes

| Failure | Cause | Fix |
|---------|-------|-----|
| `npm run build` fails | Wrong imports in src/cli/lib | Fix source files |
| `check:imports` fails | Path depths don't match | Use formula |
| CLI doesn't work | dist/cli imports wrong | Check depth |
| Module import fails | dist imports wrong | Check depths |

**Never try to "fix" dist/ - always fix source.**

---

## Common Questions

**Q: My import works in source but fails in dist/**  
A: You're editing dist/ directly. Edit the source file and rebuild.

**Q: I ran fix-dist-imports and it made things worse**  
A: Delete dist/ and rebuild: `rm -rf dist && npm run build`

**Q: How do I know if my paths are correct?**  
A: Run `npm run check:imports`. If all ✅, paths are correct.

**Q: Can I edit dist/ files?**  
A: No. They regenerate on build. Edit src/cli/lib instead.

**Q: Should I commit dist/?**  
A: Not for development. Only for published packages (and that's auto-done by npm).

---

## Emergency Recovery

If everything breaks:

```bash
# 1. Clean completely
npm run clean

# 2. Check source files for obvious mistakes
grep -r "from.*src/" cli/         # Should not have src/
grep -r "from.*[^.]\.\./" src/    # Check depth

# 3. Rebuild
npm run build

# 4. Validate
npm run check:imports

# 5. Test
node dist/cli/clodo-service.js --help
node -e "require('./dist')"

# 6. If still broken, check git history
git log --oneline -5 src/
git diff HEAD~1 src/
```

---

## Remember

```
┌─────────────────────────────────────┐
│ Source Files = Authority            │
│ dist/ Files = Generated (Read-only)  │
│ Babel = Compiler (No Manual Edits)   │
│ Validation = Automated (Always run)  │
└─────────────────────────────────────┘
```

When paths go wrong, the problem is ALWAYS in source files, never in dist/.

**Edit source. Build. Validate. Test. Repeat.**
