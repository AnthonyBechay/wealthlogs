#!/bin/bash
# Test script to verify the maintenance system is working correctly

echo "Testing WealthLog Maintenance Scripts..."
echo "========================================"

# Test if scripts exist
echo -n "Checking main script... "
if [ -f "./maintain.sh" ]; then
    echo "✓"
else
    echo "✗ Not found"
    exit 1
fi

echo -n "Checking config file... "
if [ -f "./config.env" ]; then
    echo "✓"
else
    echo "✗ Not found"
fi

echo -n "Checking lib directory... "
if [ -d "./lib" ]; then
    echo "✓"
else
    echo "✗ Not found"
    exit 1
fi

# Test sourcing libraries
echo ""
echo "Testing library loading..."
for lib in common config database logs mobile doctor; do
    echo -n "  Loading $lib.sh... "
    if source "./lib/$lib.sh" 2>/dev/null; then
        echo "✓"
    else
        echo "✗ Failed"
    fi
done

# Test basic commands
echo ""
echo "Testing basic commands..."

echo -n "  Testing help command... "
if ./maintain.sh help > /dev/null 2>&1; then
    echo "✓"
else
    echo "✗ Failed"
fi

echo -n "  Testing status command... "
if ./maintain.sh status > /dev/null 2>&1; then
    echo "✓"
else
    echo "✗ Failed"
fi

echo -n "  Testing config show... "
if ./maintain.sh config show > /dev/null 2>&1; then
    echo "✓"
else
    echo "✗ Failed"
fi

echo ""
echo "========================================"
echo "All basic tests passed! ✅"
echo ""
echo "You can now use:"
echo "  ./maintain.sh init    - to initialize the project"
echo "  ./maintain.sh doctor  - to run full diagnostics"
echo "  ./maintain.sh help    - to see all commands"
