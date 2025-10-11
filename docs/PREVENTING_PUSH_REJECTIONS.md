# Preventing "Rejected Push" Errors

## The Problem

When working with semantic-release, you might see this error:

```
! [rejected]        master -> master (non-fast-forward)
error: failed to push some refs
hint: Updates were rejected because the tip of your current branch is behind
```

## Why It Happens

Semantic-release runs on GitHub Actions and automatically:
1. Creates a release commit (e.g., "chore(release): 2.0.4")
2. Updates `package.json` and `CHANGELOG.md`
3. **Pushes directly to master**

If you make local commits without pulling first, you create divergent histories:

```
* fc5ede3 (HEAD -> master)         ← YOUR LOCAL COMMIT
| * b56f545 (origin/master)        ← SEMANTIC-RELEASE COMMIT
|/
* 1f81b5f                          ← COMMON ANCESTOR
```

## The Solution

### Option 1: Use the Safe Push Script (Recommended)

```bash
npm run push:safe
```

This script automatically:
- Fetches latest changes
- Rebases your commits on top of remote
- Pushes safely

### Option 2: Manual Workflow

```bash
# Before making commits
npm run sync          # or: git fetch && git rebase origin/master

# Make your changes and commit
git add .
git commit -m "fix: your fix message"

# Push
git push
```

### Option 3: Use Git Alias

```bash
# One-time setup (already done for this repo)
git config --local pull.rebase true

# Then use these commands
git sync              # Sync with remote
git pushsafe          # Safe push (fetch + rebase + push)
```

## Best Practices

1. **Always sync before starting work:**
   ```bash
   npm run sync
   ```

2. **Use the safe push script:**
   ```bash
   npm run push:safe
   ```

3. **If you get a rejected push:**
   ```bash
   git fetch
   git rebase origin/master
   git push
   ```

4. **If rebase shows conflicts:**
   ```bash
   # Fix conflicts in your editor
   git add .
   git rebase --continue
   git push
   ```

## Why This Matters

- ✅ **Prevents push rejections** - No more "non-fast-forward" errors
- ✅ **Clean git history** - Linear commit history, no merge commits
- ✅ **Works with CI** - Compatible with semantic-release workflow
- ✅ **Team friendly** - Same workflow for all contributors

## Quick Reference

| Command | What It Does |
|---------|-------------|
| `npm run push:safe` | Fetch, rebase, and push safely |
| `npm run sync` | Sync local with remote (fetch + rebase) |
| `git sync` | Same as npm run sync |
| `git pushsafe` | Same as npm run push:safe |
| `git st` | Enhanced status with upstream info |

## Troubleshooting

### "Rebase failed - resolve conflicts"

1. Open conflicted files in VS Code
2. Resolve conflicts using the merge editor
3. Stage resolved files: `git add .`
4. Continue rebase: `git rebase --continue`
5. Push: `git push`

### "Cannot push - permission denied"

Make sure you have push access to the repository and are authenticated.

### "Already up to date - nothing to push"

Your local branch is in sync with remote. Nothing to do!

## Technical Details

The repository is configured with:

- **Pull strategy:** `rebase` (not merge)
- **Push default:** `current` branch
- **Custom aliases:** Defined in `.gitconfig-local`
- **Safe push script:** `scripts/utilities/safe-push.ps1`

This ensures a clean, linear git history that works seamlessly with semantic-release.
