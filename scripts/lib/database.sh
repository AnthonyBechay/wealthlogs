#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                          Database Management Functions                         ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

# Source common functions
source "$(dirname "${BASH_SOURCE[0]}")/common.sh"

# ================================================================================
# DATABASE COMMANDS
# ================================================================================

# Setup database
cmd_db_setup() {
    print_header "        DATABASE SETUP        "
    
    cd "$BACKEND_DIR"
    
    print_section "Creating Database Schema"
    
    print_status "Running initial migration..."
    if npx prisma migrate dev --name initial_setup >> "$LOG_FILE" 2>&1; then
        print_success "Database created and migrated"
    else
        print_error "Migration failed - check log for details"
        show_log_info
        return 1
    fi
    
    print_section "Seeding Database (Optional)"
    
    if [ -f "prisma/seed.js" ] || [ -f "prisma/seed.ts" ]; then
        read -p "Run database seed? (y/N): " seed_confirm
        if [ "$seed_confirm" = "y" ]; then
            if npx prisma db seed >> "$LOG_FILE" 2>&1; then
                print_success "Database seeded"
            else
                print_warning "Seeding failed - check log"
            fi
        fi
    else
        print_status "No seed file found"
    fi
    
    echo ""
    print_success "Database setup complete!"
}

# Run migrations
cmd_db_migrate() {
    print_header "        DATABASE MIGRATION        "
    
    cd "$BACKEND_DIR"
    
    local migration_name="$1"
    
    if [ -n "$migration_name" ]; then
        print_status "Creating migration: $migration_name"
        if npx prisma migrate dev --name "$migration_name" >> "$LOG_FILE" 2>&1; then
            print_success "Migration created and applied"
        else
            print_error "Migration failed"
            show_log_info
            return 1
        fi
    else
        print_status "Applying pending migrations..."
        if npx prisma migrate deploy >> "$LOG_FILE" 2>&1; then
            print_success "Migrations applied"
        else
            print_error "Migration failed"
            show_log_info
            return 1
        fi
    fi
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    npx prisma generate >> "$LOG_FILE" 2>&1
    print_success "Prisma client updated"
}

# Open Prisma Studio
cmd_db_studio() {
    print_header "        OPENING PRISMA STUDIO        "
    
    cd "$BACKEND_DIR"
    
    print_status "Starting Prisma Studio..."
    print_status "URL: http://localhost:5555"
    echo ""
    print_warning "Press Ctrl+C to stop"
    
    npx prisma studio
}

# Reset database
cmd_db_reset() {
    print_header "        DATABASE RESET        "
    
    print_warning "This will DELETE all data in the database!"
    echo ""
    
    read -p "Are you absolutely sure? Type 'yes' to confirm: " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_status "Reset cancelled"
        return 0
    fi
    
    cd "$BACKEND_DIR"
    
    print_status "Resetting database..."
    if npx prisma migrate reset --force >> "$LOG_FILE" 2>&1; then
        print_success "Database reset complete"
        
        # Ask about seeding
        if [ -f "prisma/seed.js" ] || [ -f "prisma/seed.ts" ]; then
            read -p "Run database seed? (y/N): " seed_confirm
            if [ "$seed_confirm" = "y" ]; then
                npx prisma db seed >> "$LOG_FILE" 2>&1
                print_success "Database seeded"
            fi
        fi
    else
        print_error "Reset failed"
        show_log_info
        return 1
    fi
}

# Database status
cmd_db_status() {
    print_header "        DATABASE STATUS        "
    
    cd "$BACKEND_DIR"
    
    print_section "Connection Status"
    
    # Test connection
    if npx prisma db pull --print >> "$LOG_FILE" 2>&1; then
        print_success "Database connection working"
    else
        print_error "Cannot connect to database"
        print_status "Check your configuration"
        show_log_info
        return 1
    fi
    
    print_section "Migration Status"
    
    # Check migration status
    local migration_output=$(npx prisma migrate status 2>&1)
    echo "$migration_output" >> "$LOG_FILE"
    
    if echo "$migration_output" | grep -q "Database schema is up to date"; then
        print_success "Database schema is up to date"
    elif echo "$migration_output" | grep -q "migrations to apply"; then
        print_warning "Pending migrations found"
        print_status "Run: ./maintain.sh db:migrate"
    else
        print_warning "Unknown migration status"
    fi
    
    print_section "Database Information"
    
    # Parse database URL
    if [ -n "$DATABASE_URL" ]; then
        local db_info=$(echo "$DATABASE_URL" | sed 's/postgresql:\/\/\([^:]*\):[^@]*@\([^:]*\):\([^\/]*\)\/\([^?]*\).*/User: \1, Host: \2, Port: \3, Database: \4/')
        echo -e "  ${WHITE}$db_info${NC}"
    else
        echo -e "  ${WHITE}Host:${NC} ${DB_HOST:-localhost}"
        echo -e "  ${WHITE}Port:${NC} ${DB_PORT:-5432}"
        echo -e "  ${WHITE}Database:${NC} ${DB_NAME:-wealthlog}"
        echo -e "  ${WHITE}User:${NC} ${DB_USERNAME:-postgres}"
    fi
}

# Backup database
cmd_db_backup() {
    print_header "        DATABASE BACKUP        "
    
    local backup_dir="$PROJECT_ROOT/backups"
    local backup_file="$backup_dir/wealthlog_$(date +%Y%m%d_%H%M%S).sql"
    
    mkdir -p "$backup_dir"
    
    print_status "Creating backup..."
    
    # Check if pg_dump is available
    if ! command_exists pg_dump; then
        print_error "pg_dump not found. Please install PostgreSQL client tools."
        return 1
    fi
    
    # Create backup
    export PGPASSWORD="$DB_PASSWORD"
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -f "$backup_file" 2>> "$LOG_FILE"; then
        print_success "Backup created: $backup_file"
        
        # Compress backup
        if command_exists gzip; then
            gzip "$backup_file"
            print_success "Backup compressed: ${backup_file}.gz"
        fi
    else
        print_error "Backup failed"
        show_log_info
        return 1
    fi
    unset PGPASSWORD
    
    # Show backup size
    if [ -f "${backup_file}.gz" ]; then
        local size=$(ls -lh "${backup_file}.gz" | awk '{print $5}')
        print_status "Backup size: $size"
    fi
    
    # Clean old backups (keep last 10)
    print_status "Cleaning old backups..."
    ls -t "$backup_dir"/*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null || true
    
    local backup_count=$(ls "$backup_dir"/*.sql.gz 2>/dev/null | wc -l)
    print_status "Total backups: $backup_count"
}

# Restore database
cmd_db_restore() {
    print_header "        DATABASE RESTORE        "
    
    local backup_file="$1"
    local backup_dir="$PROJECT_ROOT/backups"
    
    # If no file specified, show available backups
    if [ -z "$backup_file" ]; then
        print_section "Available Backups"
        
        if [ -d "$backup_dir" ]; then
            ls -lh "$backup_dir"/*.sql.gz 2>/dev/null || print_warning "No backups found"
        else
            print_warning "No backup directory found"
        fi
        
        echo ""
        print_status "Usage: ./maintain.sh db:restore <backup-file>"
        return 0
    fi
    
    # Check if file exists
    if [ ! -f "$backup_file" ]; then
        # Try in backup directory
        if [ -f "$backup_dir/$backup_file" ]; then
            backup_file="$backup_dir/$backup_file"
        else
            print_error "Backup file not found: $backup_file"
            return 1
        fi
    fi
    
    print_warning "This will REPLACE all data in the database!"
    read -p "Continue? (y/N): " confirm
    
    if [ "$confirm" != "y" ]; then
        print_status "Restore cancelled"
        return 0
    fi
    
    # Decompress if needed
    local sql_file="$backup_file"
    if [[ "$backup_file" == *.gz ]]; then
        print_status "Decompressing backup..."
        sql_file="${backup_file%.gz}"
        gunzip -c "$backup_file" > "$sql_file"
    fi
    
    # Restore database
    print_status "Restoring database..."
    export PGPASSWORD="$DB_PASSWORD"
    
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -f "$sql_file" >> "$LOG_FILE" 2>&1; then
        print_success "Database restored successfully"
        
        # Clean up decompressed file
        if [[ "$backup_file" == *.gz ]]; then
            rm -f "$sql_file"
        fi
        
        # Run migrations to ensure schema is up to date
        cd "$BACKEND_DIR"
        print_status "Updating schema..."
        npx prisma migrate deploy >> "$LOG_FILE" 2>&1
        npx prisma generate >> "$LOG_FILE" 2>&1
        
        print_success "Database ready!"
    else
        print_error "Restore failed"
        show_log_info
        return 1
    fi
    unset PGPASSWORD
}

# Main database command handler
cmd_db() {
    case "$1" in
        setup)
            cmd_db_setup
            ;;
        migrate)
            cmd_db_migrate "$2"
            ;;
        studio)
            cmd_db_studio
            ;;
        reset)
            cmd_db_reset
            ;;
        status)
            cmd_db_status
            ;;
        backup)
            cmd_db_backup
            ;;
        restore)
            cmd_db_restore "$2"
            ;;
        *)
            print_error "Unknown database command: $1"
            echo ""
            echo "Available commands:"
            echo "  db:setup   - Create database with migrations"
            echo "  db:migrate - Run pending migrations"
            echo "  db:studio  - Open Prisma Studio GUI"
            echo "  db:reset   - Reset database (deletes all data)"
            echo "  db:status  - Check database status"
            echo "  db:backup  - Create database backup"
            echo "  db:restore - Restore from backup"
            ;;
    esac
}
