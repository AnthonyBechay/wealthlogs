#!/bin/bash

# Quick test script
cd "C:\Users\User\Desktop\wealthlogs\wealthlog\wealthlog"

echo "🧪 Testing TypeScript compilation and build..."

# Test shared package
echo "📦 Testing @wealthlog/shared..."
cd packages/shared
if npx tsc --noEmit; then
    echo "✅ @wealthlog/shared TypeScript check passed"
else
    echo "❌ @wealthlog/shared TypeScript check failed"
    exit 1
fi
cd ../..

# Test UI package  
echo "📦 Testing @wealthlog/ui..."
cd packages/ui
if npx tsc --noEmit; then
    echo "✅ @wealthlog/ui TypeScript check passed"
else
    echo "❌ @wealthlog/ui TypeScript check failed"
    exit 1
fi
cd ../..

# Test web build
echo "🌐 Testing web build..."
if npm run build:web; then
    echo "✅ Web build successful"
else
    echo "❌ Web build failed"
    exit 1
fi

echo "🎉 All tests passed!"
echo "Ready to deploy!"
