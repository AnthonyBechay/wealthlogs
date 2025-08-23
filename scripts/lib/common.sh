#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                         Common Functions Library                              ║
# ║                    Shared utilities for all maintain scripts                  ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# ================================================================================
# COLORS AND EMOJIS
# ================================================================================

# Colors for beautiful output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export MAGENTA='\033[0;35m'
export WHITE='\033[1;37m'
export GRAY='\033[0;90m'
export NC='\033[0m' # No Color

# Emojis for visual feedback
export CHECK="✅"
export CROSS="❌"
export WARN="⚠️ "
export INFO="ℹ️ "
export ROCKET="🚀"
export BUILD="🔨"
export CLEAN="🧹"
export TEST="🧪"
export DB="🗄️ "
export CLOCK="⏰"
export LOG="📝"
export CONFIG="⚙️ "
export MOBILE="📱"
export SHIELD="🛡️ "

# ================================================================================
# PATH RESOLUTION
# ================================================================================

# When sourced from maintain.sh, SCRIPT_DIR is already set to scripts/ directory
# So we use that if available, otherwise calculate it
if [ -z "$MAINTAIN_SCRIPT_DIR" ]; then
    # Being run standalone (for testing)
    export SCRIPT_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    export SCRIPT_DIR="$(dirname "$SCRIPT_LIB_DIR")"
else
    # Being sourced from maintain.sh
    export SCRIPT_DIR="$MAINTAIN_SCRIPT_DIR"
    export SCRIPT_LIB_DIR="$SCRIPT_DIR/lib"
fi

# Project root is one level up from scripts/
export PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
export CONFIG_FILE="$SCRIPT_DIR/config.env"

# ================================================================================
# CONFIGURATION LOADING
# ================================================================================

# Load configuration file
load_config() {
    local config_file="${1:-$CONFIG_FILE}"
    
    if [ -f "$config_file" ]; then
        source "$config_file"
        
        # Auto-generate secrets if empty
        if [ -z "$JWT_ACCESS_SECRET" ]; then
            export JWT_ACCESS_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "dev_access_secret_$(date +%s)")
            update_config_value "JWT_ACCESS_SECRET" "$JWT_ACCESS_SECRET"
        fi
        
        if [ -z "$JWT_REFRESH_SECRET" ]; then
            export JWT_REFRESH_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "dev_refresh_secret_$(date +%s)")
            update_config_value "JWT_REFRESH_SECRET" "$JWT_REFRESH_SECRET"
        fi
        
        if [ -z "$SESSION_SECRET" ]; then
            export SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "dev_session_secret_$(date +%s)")
            update_config_value "SESSION_SECRET" "$SESSION_SECRET"
        fi
        
        # Set default paths
        export BACKEND_DIR="${CUSTOM_BACKEND_DIR:-$PROJECT_ROOT/wealthlogs-code/apps/backend}"
        export FRONTEND_DIR="${CUSTOM_FRONTEND_DIR:-$PROJECT_ROOT/wealthlogs-code/apps/web}"
        export SHARED_DIR="${CUSTOM_SHARED_DIR:-$PROJECT_ROOT/wealthlogs-code/packages/shared}"
        export MOBILE_DIR="${CUSTOM_MOBILE_DIR:-$PROJECT_ROOT/wealthlogs-code/apps/mobile}"
        
        return 0
    else
        return 1
    fi
}

# Update a config value
update_config_value() {
    local key="$1"
    local value="$2"
    local config_file="${3:-$CONFIG_FILE}"
    
    if [ -f "$config_file" ]; then
        # Update the value in config file
        if grep -q "^${key}=" "$config_file"; then
            sed -i "s|^${key}=.*|${key}=\"${value}\"|" "$config_file"
        else
            echo "${key}=\"${value}\"" >> "$config_file"
        fi
    fi
}

# ================================================================================
# LOGGING FUNCTIONS
# ================================================================================

# Setup logging directory
setup_logging() {
    export LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/.maintain-logs}"
    export LOG_FILE="$LOG_DIR/maintain-$(date +%Y%m%d-%H%M%S).log"
    export LATEST_LOG="$LOG_DIR/latest.log"
    
    mkdir -p "$LOG_DIR"
    touch "$LOG_FILE"
    
    # On Windows/Git Bash, use copy instead of symlink
    if is_git_bash || [[ "$(get_os)" == "windows" ]]; then
        # Copy to latest.log instead of symlink
        cp "$LOG_FILE" "$LATEST_LOG" 2>/dev/null || true
    else
        # Create symlink on Unix systems
        if [ -L "$LATEST_LOG" ] || [ -e "$LATEST_LOG" ]; then
            rm -f "$LATEST_LOG"
        fi
        ln -sf "$LOG_FILE" "$LATEST_LOG"
    fi
    
    # Log header
    {
        echo "========================================="
        echo "WealthLog Maintenance Log"
        echo "Date: $(date)"
        echo "Command: $*"
        echo "========================================="
        echo ""
    } >> "$LOG_FILE"
}

# Log to file only
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "${LOG_FILE:-/dev/null}"
}

# Log and display
log_print() {
    local message="$1"
    echo -e "$message"
    # Strip color codes for log file
    echo "$message" | sed 's/\x1b\[[0-9;]*m//g' >> "${LOG_FILE:-/dev/null}"
}

# ================================================================================
# PRINT FUNCTIONS
# ================================================================================

print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${WHITE}  $1${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    log "=== $1 ==="
}

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    log "--- $1 ---"
}

print_status() { 
    echo -e "${BLUE}${INFO}${NC} $1"
    log "INFO: $1"
}

print_success() { 
    echo -e "${GREEN}${CHECK}${NC} $1"
    log "SUCCESS: $1"
}

print_error() { 
    echo -e "${RED}${CROSS}${NC} $1" >&2
    log "ERROR: $1"
}

print_warning() { 
    echo -e "${YELLOW}${WARN}${NC}$1"
    log "WARNING: $1"
}

print_build() { 
    echo -e "${CYAN}${BUILD}${NC} $1"
    log "BUILD: $1"
}

print_test() { 
    echo -e "${MAGENTA}${TEST}${NC} $1"
    log "TEST: $1"
}

# Show log file location
show_log_info() {
    if [ -n "$LOG_FILE" ]; then
        # Update latest.log on Windows
        if is_git_bash || [[ "$(get_os)" == "windows" ]]; then
            # Append to latest.log
            cat "$LOG_FILE" > "$LATEST_LOG" 2>/dev/null || true
        fi
        
        echo ""
        echo -e "${LOG} Log file: ${CYAN}$LOG_FILE${NC}"
        echo -e "${LOG} View latest: ${YELLOW}cat $LATEST_LOG${NC}"
    fi
}

# ================================================================================
# UTILITY FUNCTIONS
# ================================================================================

# Spinner for long operations
spinner() {
    local pid=$!
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps a 2>/dev/null | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [%c]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get operating system
get_os() {
    case "$OSTYPE" in
        linux*)   echo "linux" ;;
        darwin*)  echo "macos" ;;
        msys*|cygwin*|mingw*) echo "windows" ;;
        *)        echo "unknown" ;;
    esac
}

# Check if running in Git Bash on Windows
is_git_bash() {
    [[ "$OSTYPE" == "msys" ]] || [[ "$MSYSTEM" == "MINGW"* ]]
}

# Kill process on port
kill_port() {
    local port="$1"
    
    if is_git_bash; then
        # Windows with Git Bash
        netstat -ano | grep ":$port " | awk '{print $5}' | head -1 | xargs -r taskkill //PID //F 2>/dev/null || true
    elif [[ "$(get_os)" == "windows" ]]; then
        # Windows native
        netstat -ano | findstr ":$port " | findstr "LISTENING" | awk '{print $5}' | head -1 | xargs -r taskkill /PID /F 2>/dev/null || true
    elif [[ "$(get_os)" == "macos" ]]; then
        # macOS
        lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
    else
        # Linux
        fuser -k $port/tcp 2>/dev/null || true
    fi
}

# Check if port is in use
port_in_use() {
    local port="$1"
    
    if is_git_bash || [[ "$(get_os)" == "windows" ]]; then
        netstat -an | grep -q ":$port "
    else
        lsof -i:$port >/dev/null 2>&1
    fi
}

# Check Node.js version
check_node_version() {
    local required="${1:-18.0.0}"
    
    if command_exists node; then
        local current=$(node -v | sed 's/v//')
        if [ "$(printf '%s\n' "$required" "$current" | sort -V | head -n1)" = "$required" ]; then
            return 0
        else
            return 1
        fi
    else
        return 1
    fi
}

# Check npm version
check_npm_version() {
    local required="${1:-9.0.0}"
    
    if command_exists npm; then
        local current=$(npm -v)
        if [ "$(printf '%s\n' "$required" "$current" | sort -V | head -n1)" = "$required" ]; then
            return 0
        else
            return 1
        fi
    else
        return 1
    fi
}

# ================================================================================
# ERROR HANDLING
# ================================================================================

# Error handler
handle_error() {
    local line_no=$1
    local bash_lineno=$2
    local last_command=$3
    local code=$4
    
    print_error "Command failed with exit code $code"
    log "ERROR: Command '$last_command' failed at line $line_no (bash line $bash_lineno) with exit code $code"
    
    # Show helpful error message
    case $code in
        127)
            print_warning "Command not found. Check if required tools are installed."
            ;;
        126)
            print_warning "Permission denied. Check file permissions."
            ;;
        1)
            print_warning "General error. Check the log for details."
            ;;
    esac
    
    show_log_info
}

# Set error trap
set_error_trap() {
    set -eE
    trap 'handle_error $LINENO $BASH_LINENO "$BASH_COMMAND" $?' ERR
}

# ================================================================================
# VALIDATION FUNCTIONS
# ================================================================================

# Check system requirements
check_requirements() {
    local missing=0
    
    if ! command_exists node; then
        print_error "Node.js is required but not installed"
        missing=1
    elif ! check_node_version "${NODE_VERSION_REQUIRED:-18.0.0}"; then
        print_warning "Node.js version ${NODE_VERSION_REQUIRED:-18.0.0}+ required"
    fi
    
    if ! command_exists npm; then
        print_error "npm is required but not installed"
        missing=1
    elif ! check_npm_version "${NPM_VERSION_REQUIRED:-9.0.0}"; then
        print_warning "npm version ${NPM_VERSION_REQUIRED:-9.0.0}+ required"
    fi
    
    if ! command_exists git; then
        print_error "Git is required but not installed"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        echo ""
        print_error "Please install missing requirements and try again"
        exit 1
    fi
    
    # Show versions
    local node_version=$(node --version 2>/dev/null || echo "not installed")
    local npm_version=$(npm --version 2>/dev/null || echo "not installed")
    local git_version=$(git --version 2>/dev/null | cut -d' ' -f3 || echo "not installed")
    
    print_status "System: $(get_os) | Node: $node_version | npm: $npm_version | Git: $git_version"
    
    return 0
}

# Validate paths exist
validate_paths() {
    local errors=0
    
    if [ ! -d "$BACKEND_DIR" ]; then
        print_error "Backend directory not found: $BACKEND_DIR"
        errors=$((errors + 1))
    fi
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        print_error "Frontend directory not found: $FRONTEND_DIR"
        errors=$((errors + 1))
    fi
    
    if [ ! -d "$SHARED_DIR" ]; then
        print_warning "Shared directory not found: $SHARED_DIR"
    fi
    
    return $errors
}
