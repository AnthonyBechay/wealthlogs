#!/bin/bash
# Quick setup script for WealthLog maintenance system

echo "═══════════════════════════════════════════════════════"
echo "        WealthLog Quick Setup & Dependency Install     "
echo "═══════════════════════════════════════════════════════"
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Make all scripts executable
echo "1. Making scripts executable..."
chmod +x "$SCRIPT_DIR/maintain.sh" 2>/dev/null
chmod +x "$SCRIPT_DIR/test.sh" 2>/dev/null
chmod +x "$SCRIPT_DIR/lib"/*.sh 2>/dev/null
echo "   ✓ Scripts are now executable"

# Check if config exists
echo ""
echo "2. Checking configuration..."
if [ ! -f "$SCRIPT_DIR/config.env" ]; then
    echo "   Creating default configuration..."
    ./maintain.sh config create
else
    echo "   ✓ Configuration exists"
fi

# Create log directory if it doesn't exist
echo ""
echo "3. Setting up logging..."
LOG_DIR="$(dirname "$SCRIPT_DIR")/.maintain-logs"
mkdir -p "$LOG_DIR"
echo "   ✓ Log directory created"

# Install dependencies
echo ""
echo "4. Installing all dependencies..."
echo "   This will take a few minutes..."
echo ""
./maintain.sh init

echo ""
echo "═══════════════════════════════════════════════════════"
echo "                    Setup Complete!                     "
echo "═══════════════════════════════════════════════════════"
echo ""
echo "You can now use the following commands:"
echo ""
echo "  ./maintain.sh doctor    - Run system diagnostics"
echo "  ./maintain.sh test      - Run test suite"
echo "  ./maintain.sh dev       - Start development servers"
echo "  ./maintain.sh help      - See all commands"
echo ""
echo "If you encounter any issues, check the logs:"
echo "  ./maintain.sh logs      - View latest log"
echo ""
