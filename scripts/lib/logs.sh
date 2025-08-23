#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                            Logging Management Functions                        ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# Source common functions
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

# ================================================================================
# LOG COMMANDS
# ================================================================================

# View logs
cmd_logs_view() {
    local service="$1"
    
    case "$service" in
        backend)
            print_header "        BACKEND LOGS        "
            
            # Check for PM2 logs
            if command_exists pm2 && pm2 list 2>/dev/null | grep -q "backend"; then
                pm2 logs backend --lines 50
            # Check for npm logs
            elif [ -f "$BACKEND_DIR/npm-debug.log" ]; then
                tail -n 50 "$BACKEND_DIR/npm-debug.log"
            # Check for custom logs
            elif [ -f "$BACKEND_DIR/logs/app.log" ]; then
                tail -n 50 "$BACKEND_DIR/logs/app.log"
            else
                print_warning "No backend logs found"
                print_status "Start the backend first: ./maintain.sh start backend"
            fi
            ;;
            
        frontend)
            print_header "        FRONTEND LOGS        "
            
            # Check for Next.js build logs
            if [ -f "$FRONTEND_DIR/.next/trace" ]; then
                tail -n 50 "$FRONTEND_DIR/.next/trace"
            # Check for npm logs
            elif [ -f "$FRONTEND_DIR/npm-debug.log" ]; then
                tail -n 50 "$FRONTEND_DIR/npm-debug.log"
            else
                print_warning "No frontend logs found"
                print_status "Start the frontend first: ./maintain.sh start frontend"
            fi
            ;;
            
        mobile)
            print_header "        MOBILE LOGS        "
            
            if [ -f "$MOBILE_DIR/npm-debug.log" ]; then
                tail -n 50 "$MOBILE_DIR/npm-debug.log"
            else
                print_warning "No mobile logs found"
            fi
            ;;
            
        maintain|"")
            # View maintenance script logs
            if [ -f "$LATEST_LOG" ]; then
                less "$LATEST_LOG"
            else
                print_error "No maintenance logs found"
                print_status "Logs are created when you run commands"
            fi
            ;;
            
        *)
            print_error "Unknown log type: $service"
            echo "Available: backend, frontend, mobile, maintain"
            ;;
    esac
}

# List all logs
cmd_logs_list() {
    print_header "        MAINTENANCE LOGS        "
    
    if [ -d "$LOG_DIR" ]; then
        print_section "Recent Logs"
        
        # Show last 10 logs with size
        local log_count=0
        while IFS= read -r log_file; do
            if [ -f "$log_file" ]; then
                local size=$(ls -lh "$log_file" | awk '{print $5}')
                local date=$(basename "$log_file" | sed 's/maintain-\(.*\)\.log/\1/')
                echo -e "  ${CYAN}$(basename "$log_file")${NC} ${GRAY}($size)${NC}"
                log_count=$((log_count + 1))
            fi
        done < <(ls -t "$LOG_DIR"/*.log 2>/dev/null | head -10)
        
        if [ $log_count -eq 0 ]; then
            print_warning "No logs found"
        else
            echo ""
            print_status "Total logs: $(ls "$LOG_DIR"/*.log 2>/dev/null | wc -l)"
            
            # Show disk usage
            local total_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
            print_status "Total size: $total_size"
        fi
    else
        print_warning "Log directory not found"
    fi
    
    # Check for application logs
    print_section "Application Logs"
    
    [ -f "$BACKEND_DIR/logs/app.log" ] && echo -e "  ${GREEN}✓${NC} Backend application log" || echo -e "  ${GRAY}✗${NC} Backend application log"
    [ -f "$FRONTEND_DIR/.next/trace" ] && echo -e "  ${GREEN}✓${NC} Frontend build trace" || echo -e "  ${GRAY}✗${NC} Frontend build trace"
    [ -d "$BACKEND_DIR/logs" ] && echo -e "  ${GREEN}✓${NC} Backend logs directory" || echo -e "  ${GRAY}✗${NC} Backend logs directory"
}

# Clean old logs
cmd_logs_clean() {
    print_header "        CLEANING LOGS        "
    
    local keep_count="${1:-10}"
    
    print_section "Maintenance Logs"
    
    if [ -d "$LOG_DIR" ]; then
        # Count current logs
        local current_count=$(ls "$LOG_DIR"/*.log 2>/dev/null | wc -l)
        
        if [ $current_count -gt $keep_count ]; then
            # Delete old logs
            local delete_count=$((current_count - keep_count))
            print_status "Deleting $delete_count old log(s)..."
            
            ls -t "$LOG_DIR"/*.log 2>/dev/null | tail -n +$((keep_count + 1)) | while read -r log_file; do
                rm -f "$log_file"
                echo -e "  ${GRAY}Deleted: $(basename "$log_file")${NC}"
            done
            
            print_success "Cleaned $delete_count old log(s)"
        else
            print_status "No logs to clean (keeping last $keep_count)"
        fi
    fi
    
    print_section "Application Logs"
    
    # Clean backend logs
    if [ -d "$BACKEND_DIR/logs" ]; then
        local backend_size=$(du -sh "$BACKEND_DIR/logs" 2>/dev/null | cut -f1)
        print_status "Backend logs: $backend_size"
        
        read -p "Clean backend logs? (y/N): " clean_backend
        if [ "$clean_backend" = "y" ]; then
            find "$BACKEND_DIR/logs" -type f -name "*.log" -mtime +7 -delete
            print_success "Cleaned backend logs older than 7 days"
        fi
    fi
    
    # Clean npm logs
    print_status "Cleaning npm debug logs..."
    find "$PROJECT_ROOT" -name "npm-debug.log*" -delete 2>/dev/null
    find "$PROJECT_ROOT" -name "yarn-error.log*" -delete 2>/dev/null
    print_success "Cleaned npm/yarn logs"
    
    # Show final status
    echo ""
    if [ -d "$LOG_DIR" ]; then
        local final_count=$(ls "$LOG_DIR"/*.log 2>/dev/null | wc -l)
        local final_size=$(du -sh "$LOG_DIR" 2>/dev/null | cut -f1)
        print_success "Remaining logs: $final_count ($final_size)"
    fi
}

# Search logs
cmd_logs_search() {
    local search_term="$1"
    
    if [ -z "$search_term" ]; then
        print_error "Please provide a search term"
        echo "Usage: ./maintain.sh logs:search <term>"
        return 1
    fi
    
    print_header "    SEARCHING LOGS FOR: $search_term    "
    
    local found=0
    
    # Search maintenance logs
    if [ -d "$LOG_DIR" ]; then
        print_section "Maintenance Logs"
        
        grep -l "$search_term" "$LOG_DIR"/*.log 2>/dev/null | while read -r log_file; do
            echo -e "${CYAN}$(basename "$log_file")${NC}:"
            grep --color=auto -n "$search_term" "$log_file" | head -5
            echo ""
            found=$((found + 1))
        done
    fi
    
    # Search backend logs
    if [ -d "$BACKEND_DIR/logs" ]; then
        print_section "Backend Logs"
        
        grep -r "$search_term" "$BACKEND_DIR/logs" 2>/dev/null | head -10
    fi
    
    if [ $found -eq 0 ]; then
        print_warning "No matches found for: $search_term"
    fi
}

# Follow logs in real-time
cmd_logs_follow() {
    local service="${1:-maintain}"
    
    print_header "    FOLLOWING LOGS: $service    "
    print_warning "Press Ctrl+C to stop"
    echo ""
    
    case "$service" in
        backend)
            if command_exists pm2 && pm2 list 2>/dev/null | grep -q "backend"; then
                pm2 logs backend
            elif [ -f "$BACKEND_DIR/logs/app.log" ]; then
                tail -f "$BACKEND_DIR/logs/app.log"
            else
                print_error "No backend logs to follow"
            fi
            ;;
            
        frontend)
            if [ -f "$FRONTEND_DIR/.next/trace" ]; then
                tail -f "$FRONTEND_DIR/.next/trace"
            else
                print_error "No frontend logs to follow"
            fi
            ;;
            
        maintain)
            if [ -f "$LATEST_LOG" ]; then
                tail -f "$LATEST_LOG"
            else
                print_error "No maintenance log to follow"
            fi
            ;;
            
        all)
            # Follow multiple logs
            if command_exists multitail; then
                multitail "$LATEST_LOG" "$BACKEND_DIR/logs/app.log" 2>/dev/null
            else
                print_warning "Install 'multitail' to follow multiple logs"
                tail -f "$LATEST_LOG"
            fi
            ;;
            
        *)
            print_error "Unknown service: $service"
            ;;
    esac
}

# Export logs
cmd_logs_export() {
    print_header "        EXPORTING LOGS        "
    
    local export_dir="$PROJECT_ROOT/log-export-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$export_dir"
    
    print_status "Exporting to: $export_dir"
    
    # Copy maintenance logs
    if [ -d "$LOG_DIR" ]; then
        cp -r "$LOG_DIR" "$export_dir/maintenance-logs"
        print_success "Maintenance logs exported"
    fi
    
    # Copy backend logs
    if [ -d "$BACKEND_DIR/logs" ]; then
        cp -r "$BACKEND_DIR/logs" "$export_dir/backend-logs"
        print_success "Backend logs exported"
    fi
    
    # Create summary
    cat > "$export_dir/summary.txt" << EOF
WealthLog Logs Export
=====================
Date: $(date)
Environment: ${ENVIRONMENT:-development}
Node Version: $(node --version 2>/dev/null || echo "N/A")
npm Version: $(npm --version 2>/dev/null || echo "N/A")

Maintenance Logs: $(ls "$LOG_DIR"/*.log 2>/dev/null | wc -l) files
Backend Logs: $(find "$BACKEND_DIR/logs" -name "*.log" 2>/dev/null | wc -l) files

Recent Commands:
$(grep "Command:" "$LATEST_LOG" 2>/dev/null | tail -5)

Recent Errors:
$(grep "ERROR" "$LATEST_LOG" 2>/dev/null | tail -5)
EOF
    
    print_success "Summary created"
    
    # Compress
    if command_exists tar; then
        cd "$PROJECT_ROOT"
        tar -czf "log-export-$(date +%Y%m%d-%H%M%S).tar.gz" "$(basename "$export_dir")"
        rm -rf "$export_dir"
        print_success "Logs compressed: log-export-$(date +%Y%m%d-%H%M%S).tar.gz"
    fi
}

# Main logs command handler
cmd_logs() {
    case "$1" in
        view|"")
            cmd_logs_view "$2"
            ;;
        list|ls)
            cmd_logs_list
            ;;
        clean|clear)
            cmd_logs_clean "$2"
            ;;
        search|grep)
            cmd_logs_search "$2"
            ;;
        follow|tail)
            cmd_logs_follow "$2"
            ;;
        export)
            cmd_logs_export
            ;;
        backend|frontend|mobile)
            cmd_logs_view "$1"
            ;;
        *)
            print_error "Unknown logs command: $1"
            echo ""
            echo "Available commands:"
            echo "  logs         - View latest maintenance log"
            echo "  logs backend - View backend logs"
            echo "  logs frontend - View frontend logs"
            echo "  logs mobile  - View mobile logs"
            echo "  logs list    - List all logs"
            echo "  logs clean   - Clean old logs"
            echo "  logs search  - Search in logs"
            echo "  logs follow  - Follow logs in real-time"
            echo "  logs export  - Export all logs"
            ;;
    esac
}
