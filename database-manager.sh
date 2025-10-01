#!/bin/bash

# Database Manager for Todo App
# This script manages database organization and backups

set -e

PROD_DB="/opt/todo-app/databases/production/todo-app.db"
BACKUP_DIR="/opt/todo-app/databases/backups"
CURRENT_DIR="/opt/todo-app/current"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to create backup
create_backup() {
    local backup_name="todo-app-backup-$(date +%Y%m%d-%H%M%S).db"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    print_status "Creating backup: $backup_name"
    
    if [ -f "$PROD_DB" ]; then
        cp "$PROD_DB" "$backup_path"
        print_success "Backup created: $backup_path"
        
        # Keep only last 10 backups
        cd "$BACKUP_DIR"
        ls -t todo-app-backup-*.db | tail -n +11 | xargs -r rm
        print_status "Cleaned up old backups (keeping last 10)"
    else
        print_error "Production database not found: $PROD_DB"
        exit 1
    fi
}

# Function to restore from backup
restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ]; then
        print_error "Please specify backup file to restore from"
        echo "Available backups:"
        ls -la "$BACKUP_DIR"/todo-app-backup-*.db 2>/dev/null || echo "No backups found"
        exit 1
    fi
    
    local backup_path="$BACKUP_DIR/$backup_file"
    
    if [ ! -f "$backup_path" ]; then
        print_error "Backup file not found: $backup_path"
        exit 1
    fi
    
    print_warning "This will replace the current production database!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Creating safety backup before restore..."
        create_backup
        
        print_status "Restoring from backup: $backup_file"
        cp "$backup_path" "$PROD_DB"
        print_success "Database restored from: $backup_file"
    else
        print_status "Restore cancelled"
    fi
}

# Function to show database status
show_status() {
    print_status "Database Status:"
    echo "=================="
    
    if [ -f "$PROD_DB" ]; then
        echo "Production DB: $PROD_DB"
        echo "Size: $(du -h "$PROD_DB" | cut -f1)"
        echo "Last modified: $(stat -c %y "$PROD_DB")"
        
        # Get record counts
        local todos=$(sqlite3 "$PROD_DB" "SELECT COUNT(*) FROM todo_items;" 2>/dev/null || echo "0")
        local accounts=$(sqlite3 "$PROD_DB" "SELECT COUNT(*) FROM accounts;" 2>/dev/null || echo "0")
        local categories=$(sqlite3 "$PROD_DB" "SELECT COUNT(*) FROM categories;" 2>/dev/null || echo "0")
        
        echo "Records: $todos todos, $accounts accounts, $categories categories"
    else
        print_error "Production database not found: $PROD_DB"
    fi
    
    echo
    echo "Backups in $BACKUP_DIR:"
    ls -la "$BACKUP_DIR"/todo-app-backup-*.db 2>/dev/null || echo "No backups found"
}

# Function to clean up old structure
cleanup_old_structure() {
    print_status "Cleaning up old database structure..."
    
    # Remove old backup directories
    if [ -d "/opt/todo-app/backup-20250929-135547" ]; then
        rm -rf /opt/todo-app/backup-20250929-135547
        print_status "Removed old backup: backup-20250929-135547"
    fi
    
    if [ -d "/opt/todo-app/backup-20250930-203542" ]; then
        rm -rf /opt/todo-app/backup-20250930-203542
        print_status "Removed old backup: backup-20250930-203542"
    fi
    
    if [ -d "/opt/todo-app/backup-20250930-210645" ]; then
        rm -rf /opt/todo-app/backup-20250930-210645
        print_status "Removed old backup: backup-20250930-210645"
    fi
    
    if [ -d "/opt/todo-app/backup-20250930-213416" ]; then
        rm -rf /opt/todo-app/backup-20250930-213416
        print_status "Removed old backup: backup-20250930-213416"
    fi
    
    if [ -d "/opt/todo-app/backup-20251001-103408" ]; then
        rm -rf /opt/todo-app/backup-20251001-103408
        print_status "Removed old backup: backup-20251001-103408"
    fi
    
    if [ -d "/opt/todo-app/backup-20251001-151037" ]; then
        rm -rf /opt/todo-app/backup-20251001-151037
        print_status "Removed old backup: backup-20251001-151037"
    fi
    
    # Remove old data.db files
    if [ -f "/opt/todo-app/data/data.db" ]; then
        rm -f /opt/todo-app/data/data.db
        print_status "Removed old data.db from /opt/todo-app/data/"
    fi
    
    if [ -f "/opt/todo-app/current/data.db" ]; then
        rm -f /opt/todo-app/current/data.db
        print_status "Removed old data.db from /opt/todo-app/current/"
    fi
    
    print_success "Old database structure cleaned up"
}

# Main script logic
case "$1" in
    "backup")
        create_backup
        ;;
    "restore")
        restore_backup "$2"
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup_old_structure
        ;;
    *)
        echo "Todo App Database Manager"
        echo "========================="
        echo
        echo "Usage: $0 {backup|restore|status|cleanup}"
        echo
        echo "Commands:"
        echo "  backup              - Create a new backup of the production database"
        echo "  restore <file>      - Restore from a specific backup file"
        echo "  status              - Show database status and available backups"
        echo "  cleanup             - Remove old database structure and files"
        echo
        echo "Examples:"
        echo "  $0 backup"
        echo "  $0 restore todo-app-backup-20251001-151037.db"
        echo "  $0 status"
        echo "  $0 cleanup"
        ;;
esac