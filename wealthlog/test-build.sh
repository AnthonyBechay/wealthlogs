#!/bin/bash

# 🧪 Local Build Test Script
# Test TypeScript compilation before deploying

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing TypeScript builds locally...${NC}"

# Test shared package
echo -e "${YELLOW}📦 Testing @wealthlog/shared build...${NC}"
cd packages/shared
if npx tsc --noEmit; then
    echo -e "${GREEN}✅ @wealthlog/shared TypeScript check passed${NC}"
else
    echo -e "${RED}❌ @wealthlog/shared TypeScript check failed${NC}"
    exit 1
fi

# Build shared package
if npm run build; then
    echo -e "${GREEN}✅ @wealthlog/shared build successful${NC}"
else
    echo -e "${RED}❌ @wealthlog/shared build failed${NC}"
    exit 1
fi

cd ../..

# Test UI package
echo -e "${YELLOW}📦 Testing @wealthlog/ui build...${NC}"
cd packages/ui
if npx tsc --noEmit; then
    echo -e "${GREEN}✅ @wealthlog/ui TypeScript check passed${NC}"
else
    echo -e "${RED}❌ @wealthlog/ui TypeScript check failed${NC}"
    exit 1
fi

# Build UI package
if npm run build; then
    echo -e "${GREEN}✅ @wealthlog/ui build successful${NC}"
else
    echo -e "${RED}❌ @wealthlog/ui build failed${NC}"
    exit 1
fi

cd ../..

# Test full web build
echo -e "${YELLOW}🌐 Testing full web build...${NC}"
if npm run build:web; then
    echo -e "${GREEN}✅ Web build successful${NC}"
else
    echo -e "${RED}❌ Web build failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 All builds successful!${NC}"
echo -e "${BLUE}🚀 Ready to deploy to Vercel!${NC}"
echo ""
echo "📝 Next steps:"
echo "1. git add ."
echo "2. git commit -m \"fix: resolve TypeScript dynamic import issues\""
echo "3. git push"
echo "4. Deploy to Vercel"