#!/bin/bash

# Deployment script for DB Admin Interface
# Usage: ./deploy-db-admin.sh [server_ip] [ssh_key_path]

set -e

SERVER_IP=${1:-"92.204.40.235"}
SSH_KEY=${2:-"~/.ssh/id_rsa"}
APP_DIR="/opt/todo-app"
SERVICE_NAME="todo-db-admin"
DOMAIN="admin.todo.florianbolli.ch"

echo "🚀 Starting DB Admin deployment to $SERVER_IP..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📤 Uploading DB Admin files to server..."

# Upload db-admin.js
scp -i "$SSH_KEY" db-admin.js root@$SERVER_IP:/tmp/

ssh -i "$SSH_KEY" root@$SERVER_IP << EOF
    set -e
    
    echo "📁 Setting up DB Admin..."
    cd $APP_DIR
    
    # Copy db-admin.js to app directory
    cp /tmp/db-admin.js current/db-admin.js
    rm /tmp/db-admin.js
    
    # Stop service if running
    systemctl stop $SERVICE_NAME || true
    
    # Create systemd service
    echo "⚙️  Setting up systemd service for DB Admin..."
    cat > /etc/systemd/system/$SERVICE_NAME.service << 'SERVICE_EOF'
[Unit]
Description=ToDo App Database Admin Interface
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR/current
ExecStart=/usr/bin/node db-admin.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
SERVICE_EOF
    
    # Reload and start service
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    systemctl start $SERVICE_NAME
    
    # Setup nginx configuration for admin subdomain
    echo "🌐 Setting up nginx for $DOMAIN..."
    cat > /etc/nginx/sites-available/$SERVICE_NAME << 'NGINX_EOF'
server {
    listen 80;
    server_name $DOMAIN;
    
    # Basic auth for security
    # auth_basic "Database Admin";
    # auth_basic_user_file /etc/nginx/.htpasswd;
    
    location / {
        proxy_pass http://localhost:8083;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
}
NGINX_EOF
    
    # Enable nginx site
    ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/
    
    # Test and reload nginx
    nginx -t && systemctl reload nginx
    
    # Check service status
    echo "✅ Checking service status..."
    systemctl status $SERVICE_NAME --no-pager || true
    
    echo "🎉 DB Admin deployment completed!"
    echo "📝 Next steps:"
    echo "   1. Make sure DNS for $DOMAIN points to this server"
    echo "   2. Run: sudo certbot --nginx -d $DOMAIN"
    echo "   3. (Optional) Set up HTTP basic auth:"
    echo "      sudo apt install apache2-utils"
    echo "      sudo htpasswd -c /etc/nginx/.htpasswd admin"
    echo "      Then uncomment auth_basic lines in nginx config"
EOF

echo "✅ DB Admin deployment completed!"
echo "🌐 DB Admin will be available at: https://$DOMAIN"
echo "⚠️  SECURITY WARNING: Set up authentication before using in production!"

