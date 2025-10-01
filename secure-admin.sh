#!/bin/bash

# Quick script to add HTTP Basic Authentication to the admin interface
# Usage: ./secure-admin.sh [server_ip] [ssh_key_path] [username]

set -e

SERVER_IP=${1:-"92.204.40.235"}
SSH_KEY=${2:-"~/.ssh/id_rsa"}
USERNAME=${3:-"admin"}

echo "🔒 Setting up HTTP Basic Authentication for admin interface..."
echo "Username: $USERNAME"

ssh -i "$SSH_KEY" root@$SERVER_IP << EOF
    set -e
    
    # Install apache2-utils if not already installed
    if ! command -v htpasswd &> /dev/null; then
        echo "📦 Installing apache2-utils..."
        apt update && apt install -y apache2-utils
    fi
    
    # Create password file
    echo "🔑 Creating password for user: $USERNAME"
    echo "You will be prompted to enter a password..."
    htpasswd -c /etc/nginx/.htpasswd $USERNAME
    
    # Update nginx config to enable auth
    echo "📝 Updating nginx configuration..."
    
    # Check if auth is already enabled
    if grep -q "auth_basic \"Database Admin\";" /etc/nginx/sites-available/todo-app; then
        echo "✅ Authentication already enabled in nginx config"
    else
        # Enable auth_basic in the admin location
        sed -i '/# auth_basic "Database Admin";/s/^        # /        /' /etc/nginx/sites-available/todo-app
        sed -i '/# auth_basic_user_file \/etc\/nginx\/.htpasswd;/s/^        # /        /' /etc/nginx/sites-available/todo-app
    fi
    
    # Test and reload nginx
    echo "🔄 Reloading nginx..."
    nginx -t && systemctl reload nginx
    
    echo "✅ Authentication enabled!"
    echo "🌐 Access at: https://todo.florianbolli.ch/admin"
    echo "👤 Username: $USERNAME"
    echo "🔐 Password: (the one you just entered)"
EOF

echo "🎉 Admin interface is now secured!"
echo "🌐 Visit: https://todo.florianbolli.ch/admin"

