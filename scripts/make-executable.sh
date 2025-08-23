#!/bin/bash
# Make all scripts executable
echo "Making scripts executable..."

chmod +x maintain.sh
chmod +x test.sh
chmod +x lib/*.sh

echo "Done! Scripts are now executable."
echo ""
echo "You can now run:"
echo "  ./maintain.sh help"
echo "  ./maintain.sh doctor"
echo "  ./maintain.sh config show"
