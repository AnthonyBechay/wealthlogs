#!/bin/bash

# 🧪 Global TypeScript Test Script
# Can be run from anywhere in the project to test TypeScript compilation
# Usage: ./test-ts.sh [package-name]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

# Emojis
CHECK="✅"
CROSS="❌"
INFO="ℹ️"
GEAR="⚙️"
PACKAGE="📦"
BUILD="🔨"

# Find project root (look for package.json and turbo.json)
find_project_root() {
    local current_dir="$(pwd)"
    
    while [[ "$current_dir" != "/" ]]; do
        if [[ -f "$current_dir/package.json" && -f "$current_dir/turbo.json" ]]; then
            echo "$current_dir"
            return 0
        fi
        current_dir="$(dirname "$current_dir")"
    done
    
    echo ""
    return 1
}

test_typescript_package() {
    local package_path="$1"
    local package_name="$2"
    
    if [[ ! -d "$package_path" ]]; then
        echo -e "${RED}${CROSS} Package directory not found: $package_path${NC}"
        return 1
    fi
    
    if [[ ! -f "$package_path/tsconfig.json" ]]; then
        echo -e "${YELLOW}⚠️  No tsconfig.json found in $package_name, skipping${NC}"
        return 0
    fi
    
    echo -e "${BLUE}${GEAR} Testing $package_name TypeScript compilation...${NC}"
    
    cd "$package_path"
    
    # Check if TypeScript is available
    if ! command -v npx &> /dev/null; then
        echo -e "${RED}${CROSS} npx not found! Please install Node.js.${NC}"
        return 1
    fi
    
    # Run TypeScript check
    echo -e "${INFO} Running: npx tsc --noEmit"
    if npx tsc --noEmit 2>&1; then
        echo -e "${GREEN}${CHECK} $package_name TypeScript compilation successful${NC}"
        return 0
    else
        echo -e "${RED}${CROSS} $package_name TypeScript compilation failed${NC}"
        return 1
    fi
}

test_specific_package() {
    local package_name="$1"
    local project_root="$2"
    
    case "$package_name" in
        "shared"|"@wealthlog/shared")
            test_typescript_package "$project_root/packages/shared" "@wealthlog/shared"
            ;;
        "ui"|"@wealthlog/ui")
            test_typescript_package "$project_root/packages/ui" "@wealthlog/ui"
            ;;
        "web"|"@wealthlog/web")
            test_typescript_package "$project_root/apps/web" "@wealthlog/web"
            ;;
        "mobile"|"@wealthlog/mobile")
            test_typescript_package "$project_root/apps/mobile" "@wealthlog/mobile"
            ;;
        *)
            echo -e "${RED}${CROSS} Unknown package: $package_name${NC}"
            echo -e "${INFO} Available packages: shared, ui, web, mobile"
            return 1
            ;;
    esac
}

test_all_packages() {
    local project_root="$1"
    local failed=0
    
    echo -e "${PURPLE}${GEAR} Testing all TypeScript packages...${NC}"
    echo ""
    
    # Test packages
    test_typescript_package "$project_root/packages/shared" "@wealthlog/shared" || failed=1
    echo ""
    test_typescript_package "$project_root/packages/ui" "@wealthlog/ui" || failed=1
    echo ""
    
    # Test apps  
    test_typescript_package "$project_root/apps/web" "@wealthlog/web" || failed=1
    echo ""
    test_typescript_package "$project_root/apps/mobile" "@wealthlog/mobile" || failed=1
    
    return $failed
}

show_help() {
    echo -e "${WHITE}🧪 WealthLog TypeScript Test Script${NC}"
    echo ""
    echo -e "${YELLOW}Usage:${NC}"
    echo "  ./test-ts.sh                 # Test all packages"
    echo "  ./test-ts.sh [package]       # Test specific package"
    echo ""
    echo -e "${YELLOW}Available packages:${NC}"
    echo "  shared    - @wealthlog/shared package"
    echo "  ui        - @wealthlog/ui package"  
    echo "  web       - @wealthlog/web app"
    echo "  mobile    - @wealthlog/mobile app"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ./test-ts.sh shared          # Test only shared package"
    echo "  ./test-ts.sh ui              # Test only UI package"
    echo "  ./test-ts.sh                 # Test everything"
}

main() {
    # Find project root
    local project_root
    project_root=$(find_project_root)
    
    if [[ -z "$project_root" ]]; then
        echo -e "${RED}${CROSS} Could not find WealthLog project root!${NC}"
        echo -e "${INFO} Please run this script from within the WealthLog project directory."
        exit 1
    fi
    
    echo -e "${BLUE}📍 Project root: $project_root${NC}"
    
    # Save current directory and change to project root
    local original_dir="$(pwd)"
    cd "$project_root"
    
    case "${1:-all}" in
        "help"|"-h"|"--help")
            show_help
            ;;
        "all"|"")
            if test_all_packages "$project_root"; then
                echo ""
                echo -e "${GREEN}🎉 All TypeScript tests passed!${NC}"
                echo -e "${CYAN}🚀 Ready to build and deploy!${NC}"
            else
                echo ""
                echo -e "${RED}💥 Some TypeScript tests failed!${NC}"
                echo -e "${INFO} Fix the errors above before proceeding."
                cd "$original_dir"
                exit 1
            fi
            ;;
        *)
            if test_specific_package "$1" "$project_root"; then
                echo ""
                echo -e "${GREEN}${CHECK} TypeScript test passed for $1!${NC}"
            else
                echo ""
                echo -e "${RED}${CROSS} TypeScript test failed for $1!${NC}"
                cd "$original_dir"
                exit 1
            fi
            ;;
    esac
    
    # Return to original directory
    cd "$original_dir"
}

# Run main function with all arguments
main "$@"
