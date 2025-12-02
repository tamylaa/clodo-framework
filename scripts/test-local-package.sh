#!/bin/bash
# scripts/test-local-package.sh
# 
# Local package testing before semantic release
# Simulates what npm will receive when published
# 
# Usage: bash scripts/test-local-package.sh

set -e

echo "════════════════════════════════════════════════════════════"
echo "  LOCAL PACKAGE TESTING SCRIPT"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TEMP_DIR="/tmp/clodo-package-test-$$"
PACKAGE_NAME="clodo-framework-local.tgz"

cleanup() {
  echo ""
  echo "Cleaning up temporary directory: $TEMP_DIR"
  rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

echo "1️⃣  BUILDING PACKAGE..."
echo "   Running: npm run build"
npm run build > /dev/null 2>&1
echo -e "   ${GREEN}✅ Build successful${NC}"

echo ""
echo "2️⃣  CREATING TARBALL..."
echo "   Running: npm pack --dry-run"
if npm pack > /dev/null 2>&1; then
  echo -e "   ${GREEN}✅ Package dry-run successful${NC}"
else
  echo -e "   ${RED}❌ Package creation failed${NC}"
  exit 1
fi

echo ""
echo "3️⃣  PACKAGING FOR REAL..."
TARBALL=$(npm pack --silent)
echo -e "   ${GREEN}✅ Created: $TARBALL${NC}"

echo ""
echo "4️⃣  EXTRACTING PACKAGE..."
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"
tar -xzf "../${TARBALL}"
EXTRACTED_DIR=$(ls -d */ | head -1)
cd "$EXTRACTED_DIR"
echo -e "   ${GREEN}✅ Extracted to: $EXTRACTED_DIR${NC}"

echo ""
echo "5️⃣  CHECKING PACKAGE STRUCTURE..."
echo "   Verifying critical files exist:"

FILES_TO_CHECK=(
  "dist/index.js"
  "dist/cli/clodo-service.js"
  "dist/lib/shared/cloudflare/ops.js"
  "dist/utils/cloudflare/ops.js"
  "dist/simple-api.js"
  "dist/config/validation-config.json"
  "package.json"
  "README.md"
  "LICENSE"
)

for file in "${FILES_TO_CHECK[@]}"; do
  if [ -f "$file" ]; then
    echo -e "   ${GREEN}✅${NC} $file"
  else
    echo -e "   ${RED}❌${NC} $file (MISSING!)"
    exit 1
  fi
done

echo ""
echo "6️⃣  VERIFYING IMPORT PATHS..."
echo "   Checking dist/utils/cloudflare/ops.js"
if grep -q "from.*lib/shared/cloudflare/ops.js" "dist/utils/cloudflare/ops.js"; then
  echo -e "   ${GREEN}✅${NC} ops.js has correct import path"
else
  echo -e "   ${RED}❌${NC} ops.js has WRONG import path"
  exit 1
fi

echo "   Checking CLI command imports"
if grep -q "from '../../lib/shared/utils/cli-options.js'" "dist/cli/commands/create.js"; then
  echo -e "   ${GREEN}✅${NC} CLI commands have correct import paths"
else
  echo -e "   ${RED}❌${NC} CLI commands have WRONG import paths"
  exit 1
fi

echo ""
echo "7️⃣  TESTING CLI FROM PACKAGE..."
echo "   Running: node dist/cli/clodo-service.js --help"
if node dist/cli/clodo-service.js --help > /dev/null 2>&1; then
  echo -e "   ${GREEN}✅ CLI works${NC}"
else
  echo -e "   ${RED}❌ CLI is broken${NC}"
  exit 1
fi

echo ""
echo "8️⃣  TESTING MODULE IMPORTS FROM PACKAGE..."
echo "   Testing: require('./dist/index.js')"
if node -e "
  try {
    const mod = require('./dist/index.js');
    console.log('   ✅ Module imports successfully');
    console.log('   ✅ Found', Object.keys(mod).length, 'exports');
  } catch (e) {
    console.log('   ❌ Module import failed:', e.message);
    process.exit(1);
  }
" 2>/dev/null; then
  echo -e "   ${GREEN}✅ Module imports work${NC}"
else
  echo -e "   ${RED}❌ Module import failed${NC}"
  exit 1
fi

echo ""
echo "9️⃣  TESTING SPECIFIC EXPORTS..."
node -e "
  const mod = require('./dist/index.js');
  const testExports = ['Clodo', 'ConfigurationManager', 'EnhancedRouter', 'ServiceOrchestrator'];
  
  testExports.forEach(exp => {
    if (mod[exp]) {
      console.log('   ✅ ' + exp);
    } else {
      console.log('   ❌ ' + exp + ' NOT FOUND');
      process.exit(1);
    }
  });
" 2>/dev/null || exit 1

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ ALL LOCAL PACKAGE TESTS PASSED${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📦 SUMMARY:"
echo "   Package file: $TARBALL"
echo "   Package size: $(du -h ../"$TARBALL" | cut -f1)"
echo ""
echo "🚀 NEXT STEPS:"
echo "   1. Commit your changes: git add . && git commit -m 'fix: path issues'"
echo "   2. Push to main: git push origin main"
echo "   3. GitHub Actions will run semantic-release"
echo "   4. Package will be published to npm automatically"
echo ""

# Cleanup is automatic via trap
