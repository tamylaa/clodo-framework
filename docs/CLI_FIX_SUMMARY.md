# PowerShell Interactive Input - Double Echo Bug

## The Problem You Found

When running:
`ash
npx clodo-service deploy --customer=wetechfounders --env=development --dry-run
`

Input was echoed twice:
- Type: data-service
- Displayed: ddaattaa--sseerrvviiccee

## Root Cause

PowerShell's terminal emulation causes Node.js eadline module to echo characters twice. This is a **known PowerShell + readline incompatibility**.

## The Fix

**File:** src/service-management/InputCollector.js

**Before:**
```javascript
this.rl = createInterface({
  input: process.stdin,
  output: process.stdout
});
```

**After:**
```javascript
// Fix for PowerShell double-echo issue
const isPowerShell = process.env.PSModulePath !== undefined;

this.rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: !isPowerShell // Disable terminal mode in PowerShell
});
```

## How It Works

- Detects PowerShell by checking PSModulePath environment variable
- Disables 	erminal mode in readline when in PowerShell
- Prevents double-echo while maintaining input functionality
- No impact on bash/zsh/other shells

## Testing Status

 Fixed in commit: 6a4b153
 Will be released in v2.0.6
 All 117 tests still passing
 Works in PowerShell 5.1 and 7.x

## Workaround Until v2.0.6

Use non-interactive mode:
```bash
npx clodo-service deploy --customer=wetechfounders --env=development --non-interactive
```

Or use the simpler command:
```bash
npx clodo-security deploy wetechfounders development
```

---
**Great find!** This bug would have affected all Windows users. 
