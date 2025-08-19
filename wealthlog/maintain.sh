#!/bin/bash

# 🏦 WealthLog Maintenance Script
# Usage: ./maintain.sh [soft|hard|reset|build|dev|help]
# Compatible with Git Bash, WSL, and Unix systems

set -e  # Exit on any error

# Colors for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Emojis for better UX
ROCKET="🚀"
CLEAN="🧹"
BUILD="🔨"
CHECK="✅"
CROSS="❌"
INFO="ℹ️"
FIRE="🔥"
GEAR="⚙️"
PACKAGE="📦"
WEB="🌐"
MOBILE="📱"
SERVER="🖥️"

# Project info
PROJECT_NAME="WealthLog"
SCRIPT_VERSION="1.0.0"

print_header() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    🏦 $PROJECT_NAME Maintenance                   ║"
    echo "║                        Version $SCRIPT_VERSION                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_help() {
    echo -e "${WHITE}Usage:${NC} ./maintain.sh [command]"
    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo -e "  ${GREEN}soft${NC}     ${CLEAN} Soft cleanup (node_modules, build cache)"
    echo -e "  ${RED}hard${NC}     ${FIRE} Hard cleanup (+ lock files, force fresh install)"
    echo -e "  ${BLUE}reset${NC}    ${GEAR} Nuclear reset (everything + git clean)"
    echo -e "  ${CYAN}build${NC}    ${BUILD} Clean build all packages"
    echo -e "  ${PURPLE}dev${NC}      ${ROCKET} Start development servers"
    echo -e "  ${WHITE}help${NC}     ${INFO} Show this help message"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  ./maintain.sh soft          # Quick cleanup"
    echo -e "  ./maintain.sh hard          # Deep cleanup"
    echo -e "  ./maintain.sh build         # Build everything"
    echo -e "  ./maintain.sh dev           # Start dev servers"
}

check_project_root() {
    if [[ ! -f "package.json" ]] || [[ ! -f "turbo.json" ]]; then
        echo -e "${RED}${CROSS} Error: Not in WealthLog project root!${NC}"
        echo -e "${INFO} Please run this script from the project root directory."
        exit 1
    fi
    
    if [[ ! -d "packages/shared" ]] || [[ ! -d "packages/ui" ]]; then
        echo -e "${RED}${CROSS} Error: Missing required packages!${NC}"
        echo -e "${INFO} Expected packages/shared and packages/ui directories."
        exit 1
    fi
    
    echo -e "${GREEN}${CHECK} Project structure validated${NC}"
}

cleanup_node_modules() {
    local level=$1
    echo -e "${YELLOW}${CLEAN} Cleaning node_modules...${NC}"
    
    # Root node_modules
    if [[ -d "node_modules" ]]; then
        rm -rf "node_modules"
        echo -e "${GREEN}  ${CHECK} Removed root node_modules${NC}"
    fi
    
    # Apps node_modules
    for app in apps/*/; do
        if [[ -d "${app}node_modules" ]]; then
            rm -rf "${app}node_modules"
            echo -e "${GREEN}  ${CHECK} Removed ${app}node_modules${NC}"
        fi
    done
    
    # Packages node_modules
    for pkg in packages/*/; do
        if [[ -d "${pkg}node_modules" ]]; then
            rm -rf "${pkg}node_modules"
            echo -e "${GREEN}  ${CHECK} Removed ${pkg}node_modules${NC}"
        fi
    done
}

cleanup_build_cache() {
    echo -e "${YELLOW}${CLEAN} Cleaning build cache...${NC}"
    
    # Next.js cache
    rm -rf .next apps/*/.next
    echo -e "${GREEN}  ${CHECK} Removed .next cache${NC}"
    
    # TypeScript build outputs
    rm -rf packages/*/dist
    echo -e "${GREEN}  ${CHECK} Removed dist directories${NC}"
    
    # Turbo cache
    if [[ -d ".turbo" ]]; then
        rm -rf .turbo
        echo -e "${GREEN}  ${CHECK} Removed turbo cache${NC}"
    fi
    
    # Capacitor builds
    rm -rf apps/mobile/dist apps/mobile/android/app/build apps/mobile/ios/App/App.xcarchive
    echo -e "${GREEN}  ${CHECK} Removed mobile build cache${NC}"
}

cleanup_lock_files() {
    echo -e "${YELLOW}${CLEAN} Removing lock files...${NC}"
    
    if [[ -f "package-lock.json" ]]; then
        rm package-lock.json
        echo -e "${GREEN}  ${CHECK} Removed package-lock.json${NC}"
    fi
    
    if [[ -f "yarn.lock" ]]; then
        rm yarn.lock
        echo -e "${GREEN}  ${CHECK} Removed yarn.lock${NC}"
    fi
    
    if [[ -f "pnpm-lock.yaml" ]]; then
        rm pnpm-lock.yaml
        echo -e "${GREEN}  ${CHECK} Removed pnpm-lock.yaml${NC}"
    fi
}

soft_cleanup() {
    echo -e "${CYAN}${ROCKET} Starting soft cleanup...${NC}"
    cleanup_node_modules
    cleanup_build_cache
    echo -e "${GREEN}${CHECK} Soft cleanup completed!${NC}"
}

hard_cleanup() {
    echo -e "${RED}${FIRE} Starting hard cleanup...${NC}"
    cleanup_node_modules
    cleanup_build_cache
    cleanup_lock_files
    
    # Remove any potential legacy files
    if [[ -d "packages/common" ]]; then
        rm -rf "packages/common"
        echo -e "${GREEN}  ${CHECK} Removed legacy packages/common${NC}"
    fi
    
    echo -e "${GREEN}${CHECK} Hard cleanup completed!${NC}"
}

nuclear_reset() {
    echo -e "${RED}${FIRE}${FIRE} Starting nuclear reset...${NC}"
    echo -e "${YELLOW}⚠️  This will remove ALL untracked files!${NC}"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${INFO} Nuclear reset cancelled."
        return
    fi
    
    hard_cleanup
    
    # Git clean (removes all untracked files)
    git clean -fdx
    echo -e "${GREEN}  ${CHECK} Git workspace cleaned${NC}"
    
    echo -e "${GREEN}${CHECK} Nuclear reset completed!${NC}"
}

install_dependencies() {
    echo -e "${BLUE}${PACKAGE} Installing dependencies...${NC}"
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}${CROSS} npm not found! Please install Node.js.${NC}"
        exit 1
    fi
    
    # Install with workspaces
    npm install --workspaces --include-workspace-root
    echo -e "${GREEN}${CHECK} Dependencies installed!${NC}"
}

build_packages() {
    echo -e "${CYAN}${BUILD} Building packages...${NC}"
    
    # Build shared packages first
    echo -e "${INFO} Building shared packages..."
    npm run build --workspace=@wealthlog/shared
    npm run build --workspace=@wealthlog/ui
    
    # Build apps
    echo -e "${INFO} Building applications..."
    npm run build:backend
    npm run build:web
    
    echo -e "${GREEN}${CHECK} Build completed!${NC}"
}

start_dev_servers() {
    echo -e "${PURPLE}${ROCKET} Development server options:${NC}"
    echo ""
    echo -e "1. ${WEB} Web app only       (npm run dev:web)"
    echo -e "2. ${MOBILE} Mobile app only    (npm run dev:mobile)"
    echo -e "3. ${SERVER} Backend only       (npm run dev:backend)"
    echo -e "4. ${ROCKET} All services       (npm run dev)"
    echo ""
    read -p "Choose option (1-4): " -n 1 -r
    echo
    
    case $REPLY in
        1) npm run dev:web ;;
        2) npm run dev:mobile ;;
        3) npm run dev:backend ;;
        4) npm run dev ;;
        *) echo -e "${RED}Invalid option${NC}" ;;
    esac
}

show_status() {
    echo -e "${WHITE}${INFO} Project Status:${NC}"
    echo ""
    
    # Check packages structure
    echo -e "${CYAN}📂 Packages:${NC}"
    for pkg in packages/*/; do
        if [[ -d "$pkg" ]]; then
            pkg_name=$(basename "$pkg")
            if [[ -f "${pkg}package.json" ]]; then
                version=$(grep '"version"' "${pkg}package.json" | cut -d'"' -f4)
                echo -e "  ${GREEN}${CHECK} ${pkg_name}${NC} (v${version})"
            else
                echo -e "  ${RED}${CROSS} ${pkg_name}${NC} (no package.json)"
            fi
        fi
    done
    
    echo ""
    echo -e "${CYAN}📱 Apps:${NC}"
    for app in apps/*/; do
        if [[ -d "$app" ]]; then
            app_name=$(basename "$app")
            if [[ -f "${app}package.json" ]]; then
                version=$(grep '"version"' "${app}package.json" | cut -d'"' -f4)
                echo -e "  ${GREEN}${CHECK} ${app_name}${NC} (v${version})"
            else
                echo -e "  ${RED}${CROSS} ${app_name}${NC} (no package.json)"
            fi
        fi
    done
    
    echo ""
    if [[ -f "package-lock.json" ]]; then
        echo -e "${GREEN}${CHECK} Dependencies locked${NC}"
    else
        echo -e "${YELLOW}⚠️  No package-lock.json (run install)${NC}"
    fi
}

main() {
    print_header
    check_project_root
    
    case ${1:-help} in
        "soft")
            soft_cleanup
            install_dependencies
            show_status
            echo -e "${GREEN}${ROCKET} Ready for development!${NC}"
            ;;
        "hard")
            hard_cleanup
            install_dependencies
            show_status
            echo -e "${GREEN}${ROCKET} Fresh installation complete!${NC}"
            ;;
        "reset")
            nuclear_reset
            install_dependencies
            build_packages
            show_status
            echo -e "${GREEN}${ROCKET} Nuclear reset complete!${NC}"
            ;;
        "build")
            build_packages
            echo -e "${GREEN}${ROCKET} Build complete!${NC}"
            ;;
        "dev")
            start_dev_servers
            ;;
        "status")
            show_status
            ;;
        "help"|*)
            print_help
            ;;
    esac
}

# Run main function with all arguments
main "$@"