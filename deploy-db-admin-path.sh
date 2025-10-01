#!/bin/bash

# Deployment script for DB Admin Interface (Path-based)
# Access at: https://todo.florianbolli.ch/admin
# Usage: ./deploy-db-admin-path.sh [server_ip] [ssh_key_path]

set -e

SERVER_IP=${1:-"92.204.40.235"}
SSH_KEY=${2:-"~/.ssh/id_rsa"}
APP_DIR="/opt/todo-app"
SERVICE_NAME="todo-db-admin"

echo "🚀 Starting DB Admin deployment to $SERVER_IP..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📤 Uploading DB Admin files to server..."

# Upload db-admin.js
scp -i "$SSH_KEY" db-admin.js root@$SERVER_IP:/tmp/

ssh -i "$SSH_KEY" root@$SERVER_IP << 'EOF'
    set -e
    
    echo "📁 Setting up DB Admin..."
    cd /opt/todo-app
    
    # Copy db-admin.js to app directory
    cp /tmp/db-admin.js current/db-admin.js
    rm /tmp/db-admin.js
    
    # Stop service if running
    systemctl stop todo-db-admin 2>/dev/null || true
    
    # Create systemd service
    echo "⚙️  Setting up systemd service for DB Admin..."
    cat > /etc/systemd/system/todo-db-admin.service << 'SERVICE_EOF'
[Unit]
Description=ToDo App Database Admin Interface
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/todo-app/current
ExecStart=/usr/bin/node db-admin.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICE_EOF
    
    # Reload and start service
    systemctl daemon-reload
    systemctl enable todo-db-admin
    systemctl start todo-db-admin
    
    # Update existing nginx configuration for main app
    echo "🌐 Updating nginx configuration to add /admin path..."
    
    # Backup existing config
    cp /etc/nginx/sites-available/todo-app /etc/nginx/sites-available/todo-app.backup-$(date +%Y%m%d-%H%M%S)
    
    # Check if the admin location already exists
    if grep -q "location /admin" /etc/nginx/sites-available/todo-app; then
        echo "✅ Admin location already exists in nginx config"
    else
        # Add admin location before the main location block
        sed -i '/location \/ {/i \    # Database Admin Interface\n    location /admin {\n        proxy_pass http://localhost:8083/;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection '"'"'upgrade'"'"';\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_cache_bypass $http_upgrade;\n        \n        # Security headers\n        add_header X-Frame-Options "SAMEORIGIN" always;\n        add_header X-Content-Type-Options "nosniff" always;\n        add_header X-XSS-Protection "1; mode=block" always;\n        \n        # Optional: Enable HTTP Basic Auth (recommended!)\n        # auth_basic "Database Admin";\n        # auth_basic_user_file /etc/nginx/.htpasswd;\n    }\n' /etc/nginx/sites-available/todo-app
    fi
    
    # Test and reload nginx
    nginx -t && systemctl reload nginx
    
    # Check service status
    echo "✅ Checking service status..."
    systemctl status todo-db-admin --no-pager || true
    
    echo "🎉 DB Admin deployment completed!"
    echo "📝 Access at: https://todo.florianbolli.ch/admin"
    echo ""
    echo "⚠️  SECURITY WARNING: Set up authentication before using in production!"
    echo "To enable HTTP Basic Auth:"
    echo "  1. sudo apt install apache2-utils"
    echo "  2. sudo htpasswd -c /etc/nginx/.htpasswd admin"
    echo "  3. Edit /etc/nginx/sites-available/todo-app"
    echo "  4. Uncomment the auth_basic lines in the /admin location"
    echo "  5. sudo systemctl reload nginx"
EOF

echo "✅ DB Admin deployment completed!"
echo "🌐 DB Admin is available at: https://todo.florianbolli.ch/admin"
echo "⚠️  IMPORTANT: Set up authentication before using in production!"

