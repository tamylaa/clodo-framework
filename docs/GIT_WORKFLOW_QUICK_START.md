# Quick Start: Never Get Push Rejected Again

## The One Command You Need

```bash
npm run sync
```

**Run this BEFORE you start working** - it pulls latest changes and rebases your work on top.

## Simple Workflow

```bash
# 1. Sync before starting (IMPORTANT!)
npm run sync

# 2. Make your changes
git add .
git commit -m "fix: your changes"

# 3. Sync again (in case CI pushed while you were working)
npm run sync

# 4. Push
git push
```

## Even Simpler (when it's working)

```bash
# Just use this and it does everything
npm run push:safe
```

*(Note: Currently has emoji encoding issues in PowerShell, use manual workflow above)*

## Why This Happens

- Semantic-release (CI) automatically pushes version bumps to master
- If you push without pulling first → rejected push error
- Solution: Always sync before pushing

## That's It!

Just remember: **`npm run sync` before you work** 🎯

For details, see: [docs/PREVENTING_PUSH_REJECTIONS.md](./PREVENTING_PUSH_REJECTIONS.md)
