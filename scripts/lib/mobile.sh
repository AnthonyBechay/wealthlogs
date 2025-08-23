#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                         Mobile App Management Functions                        ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# Source common functions
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

# ================================================================================
# MOBILE COMMANDS
# ================================================================================

# Initialize mobile app
cmd_mobile_init() {
    print_header "    INITIALIZING MOBILE APP    "
    
    if [ ! -d "$MOBILE_DIR" ]; then
        print_error "Mobile directory not found: $MOBILE_DIR"
        return 1
    fi
    
    cd "$MOBILE_DIR"
    
    print_section "Installing Dependencies"
    
    print_status "Installing mobile dependencies..."
    npm install --force >> "$LOG_FILE" 2>&1 &
    spinner
    print_success "Dependencies installed"
    
    print_section "Installing Capacitor"
    
    # Check if Capacitor is already installed
    if [ ! -f "capacitor.config.json" ] && [ ! -f "capacitor.config.ts" ]; then
        print_status "Setting up Capacitor..."
        npx cap init "WealthLog" "${ANDROID_PACKAGE_NAME:-com.wealthlogs.app}" >> "$LOG_FILE" 2>&1
        print_success "Capacitor initialized"
    else
        print_status "Capacitor already configured"
    fi
    
    # Add platforms
    print_section "Adding Platforms"
    
    if [ ! -d "ios" ]; then
        print_status "Adding iOS platform..."
        npx cap add ios >> "$LOG_FILE" 2>&1
        print_success "iOS platform added"
    else
        print_status "iOS platform already exists"
    fi
    
    if [ ! -d "android" ]; then
        print_status "Adding Android platform..."
        npx cap add android >> "$LOG_FILE" 2>&1
        print_success "Android platform added"
    else
        print_status "Android platform already exists"
    fi
    
    print_section "Creating Configuration"
    
    # Create capacitor config if not exists
    if [ ! -f "capacitor.config.json" ]; then
        cat > "capacitor.config.json" << EOF
{
  "appId": "${ANDROID_PACKAGE_NAME:-com.wealthlogs.app}",
  "appName": "WealthLog",
  "webDir": "build",
  "server": {
    "androidScheme": "https",
    "iosScheme": "https",
    "cleartext": true
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#1a1a1a",
      "showSpinner": false
    }
  }
}
EOF
        print_success "Capacitor config created"
    fi
    
    # Create .env if not exists
    if [ ! -f ".env" ]; then
        cat > ".env" << EOF
REACT_APP_API_URL=http://localhost:${DEV_BACKEND_PORT:-5000}
REACT_APP_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-your-google-client-id.apps.googleusercontent.com}
EOF
        print_success "Mobile .env created"
    fi
    
    echo ""
    print_success "Mobile app initialized!"
}

# Sync Capacitor
cmd_mobile_sync() {
    print_header "    SYNCING CAPACITOR    "
    
    cd "$MOBILE_DIR"
    
    print_status "Building web assets..."
    npm run build >> "$LOG_FILE" 2>&1 &
    spinner
    print_success "Build complete"
    
    print_status "Syncing to native projects..."
    npx cap sync >> "$LOG_FILE" 2>&1
    print_success "Sync complete"
    
    # Update native project settings
    print_status "Updating native configurations..."
    npx cap update >> "$LOG_FILE" 2>&1
    print_success "Native projects updated"
}

# Build mobile app
cmd_mobile_build() {
    local platform="${1:-both}"
    
    print_header "    BUILDING MOBILE APP: ${platform^^}    "
    
    cd "$MOBILE_DIR"
    
    # Build web assets first
    print_section "Building Web Assets"
    
    print_status "Creating production build..."
    npm run build >> "$LOG_FILE" 2>&1 &
    spinner
    print_success "Web build complete"
    
    # Sync with native
    print_status "Syncing with native projects..."
    npx cap sync >> "$LOG_FILE" 2>&1
    
    case "$platform" in
        ios)
            cmd_mobile_build_ios
            ;;
        android)
            cmd_mobile_build_android
            ;;
        both|all)
            cmd_mobile_build_ios
            echo ""
            cmd_mobile_build_android
            ;;
        *)
            print_error "Unknown platform: $platform"
            echo "Use: ios, android, or both"
            return 1
            ;;
    esac
}

# Build iOS app
cmd_mobile_build_ios() {
    print_section "Building iOS App"
    
    # Check for Xcode
    if [[ "$(get_os)" != "macos" ]]; then
        print_error "iOS builds require macOS with Xcode"
        return 1
    fi
    
    if ! command_exists xcodebuild; then
        print_error "Xcode command line tools not found"
        print_status "Install with: xcode-select --install"
        return 1
    fi
    
    cd "$MOBILE_DIR/ios/App"
    
    print_status "Building iOS app..."
    
    # Build for simulator
    xcodebuild -workspace App.xcworkspace \
               -scheme App \
               -configuration Debug \
               -sdk iphonesimulator \
               -derivedDataPath build >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "iOS build complete"
        print_status "Build location: $MOBILE_DIR/ios/App/build"
    else
        print_error "iOS build failed - check log"
        show_log_info
        return 1
    fi
}

# Build Android app
cmd_mobile_build_android() {
    print_section "Building Android App"
    
    # Check for Android SDK
    if [ -z "$ANDROID_HOME" ]; then
        print_warning "ANDROID_HOME not set"
        print_status "Please set up Android SDK"
    fi
    
    cd "$MOBILE_DIR/android"
    
    print_status "Building Android app..."
    
    # Build debug APK
    if [[ "$(get_os)" == "windows" ]] || is_git_bash; then
        ./gradlew.bat assembleDebug >> "$LOG_FILE" 2>&1
    else
        ./gradlew assembleDebug >> "$LOG_FILE" 2>&1
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Android build complete"
        
        # Find APK
        local apk_path=$(find app/build/outputs/apk/debug -name "*.apk" 2>/dev/null | head -1)
        if [ -n "$apk_path" ]; then
            print_status "APK location: $apk_path"
            
            # Copy to project root
            cp "$apk_path" "$PROJECT_ROOT/wealthlog-debug.apk"
            print_success "APK copied to: $PROJECT_ROOT/wealthlog-debug.apk"
        fi
    else
        print_error "Android build failed - check log"
        show_log_info
        return 1
    fi
}

# Run mobile app
cmd_mobile_run() {
    local platform="${1:-android}"
    
    print_header "    RUNNING MOBILE APP: ${platform^^}    "
    
    cd "$MOBILE_DIR"
    
    # Ensure latest build
    print_status "Syncing latest changes..."
    npx cap sync >> "$LOG_FILE" 2>&1
    
    case "$platform" in
        ios)
            if [[ "$(get_os)" != "macos" ]]; then
                print_error "iOS development requires macOS"
                return 1
            fi
            
            print_status "Opening in Xcode..."
            npx cap open ios
            
            echo ""
            print_status "Instructions:"
            echo "  1. Select a simulator or device"
            echo "  2. Click the Run button (▶)"
            ;;
            
        android)
            print_status "Checking for connected devices..."
            
            if command_exists adb; then
                local devices=$(adb devices | grep -v "List" | grep device | wc -l)
                
                if [ $devices -eq 0 ]; then
                    print_warning "No Android devices found"
                    echo ""
                    echo "Options:"
                    echo "  1. Connect an Android device with USB debugging"
                    echo "  2. Start an Android emulator"
                    echo "  3. Run: npx cap open android"
                    return 1
                fi
                
                print_success "Found $devices device(s)"
            fi
            
            print_status "Running on Android..."
            npx cap run android >> "$LOG_FILE" 2>&1
            
            if [ $? -ne 0 ]; then
                print_warning "Direct run failed, opening Android Studio..."
                npx cap open android
            fi
            ;;
            
        web|browser)
            print_status "Starting mobile web preview..."
            npm start
            ;;
            
        *)
            print_error "Unknown platform: $platform"
            echo "Use: ios, android, or web"
            return 1
            ;;
    esac
}

# Mobile development server
cmd_mobile_dev() {
    print_header "    STARTING MOBILE DEV SERVER    "
    
    cd "$MOBILE_DIR"
    
    # Check port
    if port_in_use "${DEV_MOBILE_PORT:-3003}"; then
        print_warning "Port ${DEV_MOBILE_PORT:-3003} is in use"
        read -p "Kill existing process? (y/N): " kill_confirm
        if [ "$kill_confirm" = "y" ]; then
            kill_port "${DEV_MOBILE_PORT:-3003}"
            print_success "Port freed"
        fi
    fi
    
    print_status "Starting development server..."
    print_status "URL: http://localhost:${DEV_MOBILE_PORT:-3003}"
    echo ""
    print_warning "Use this for mobile browser testing"
    print_status "For native app: ./maintain.sh mobile run [ios|android]"
    echo ""
    
    # Set port and start
    PORT="${DEV_MOBILE_PORT:-3003}" npm start
}

# Check mobile requirements
cmd_mobile_doctor() {
    print_header "    MOBILE DEVELOPMENT CHECK    "
    
    local issues=0
    
    print_section "System Requirements"
    
    # Check OS
    local os=$(get_os)
    print_status "Operating System: $os"
    
    # Check Node/npm
    check_requirements
    
    print_section "Mobile SDKs"
    
    # Check for iOS development
    if [[ "$os" == "macos" ]]; then
        if command_exists xcodebuild; then
            local xcode_version=$(xcodebuild -version | head -1)
            print_success "Xcode: $xcode_version"
        else
            print_warning "Xcode not found (required for iOS)"
            issues=$((issues + 1))
        fi
        
        if command_exists pod; then
            local pod_version=$(pod --version)
            print_success "CocoaPods: $pod_version"
        else
            print_warning "CocoaPods not found"
            print_status "Install with: sudo gem install cocoapods"
        fi
    else
        print_status "iOS development requires macOS"
    fi
    
    # Check for Android development
    if [ -n "$ANDROID_HOME" ]; then
        print_success "Android SDK: $ANDROID_HOME"
        
        if command_exists adb; then
            local adb_version=$(adb version | head -1)
            print_success "ADB: Found"
        else
            print_warning "ADB not in PATH"
        fi
    else
        print_warning "Android SDK not configured"
        print_status "Set ANDROID_HOME environment variable"
        issues=$((issues + 1))
    fi
    
    if [ -n "$JAVA_HOME" ]; then
        print_success "Java: $JAVA_HOME"
    else
        print_warning "JAVA_HOME not set"
    fi
    
    print_section "Capacitor Status"
    
    if [ -d "$MOBILE_DIR" ]; then
        cd "$MOBILE_DIR"
        
        if [ -f "capacitor.config.json" ] || [ -f "capacitor.config.ts" ]; then
            print_success "Capacitor configured"
            
            [ -d "ios" ] && print_success "iOS platform added" || print_warning "iOS platform not added"
            [ -d "android" ] && print_success "Android platform added" || print_warning "Android platform not added"
        else
            print_warning "Capacitor not configured"
            print_status "Run: ./maintain.sh mobile init"
            issues=$((issues + 1))
        fi
    else
        print_error "Mobile directory not found"
        issues=$((issues + 1))
    fi
    
    # Summary
    echo ""
    if [ $issues -eq 0 ]; then
        print_success "Mobile development ready!"
    else
        print_warning "Found $issues issue(s)"
        echo ""
        echo "Recommendations:"
        
        if [[ "$os" != "macos" ]] && [ -z "$ANDROID_HOME" ]; then
            echo "  • Install Android Studio for Android development"
        fi
        
        if [ ! -d "$MOBILE_DIR/ios" ] && [ ! -d "$MOBILE_DIR/android" ]; then
            echo "  • Run: ./maintain.sh mobile init"
        fi
    fi
}

# Main mobile command handler
cmd_mobile() {
    case "$1" in
        init|setup)
            cmd_mobile_init
            ;;
        sync)
            cmd_mobile_sync
            ;;
        build)
            cmd_mobile_build "$2"
            ;;
        run)
            cmd_mobile_run "$2"
            ;;
        dev|start)
            cmd_mobile_dev
            ;;
        doctor|check)
            cmd_mobile_doctor
            ;;
        *)
            print_error "Unknown mobile command: $1"
            echo ""
            echo "Available commands:"
            echo "  mobile init   - Initialize mobile app"
            echo "  mobile sync   - Sync web assets to native"
            echo "  mobile build  - Build mobile app"
            echo "  mobile run    - Run on device/emulator"
            echo "  mobile dev    - Start dev server"
            echo "  mobile doctor - Check requirements"
            echo ""
            echo "Examples:"
            echo "  ./maintain.sh mobile build ios"
            echo "  ./maintain.sh mobile run android"
            ;;
    esac
}
