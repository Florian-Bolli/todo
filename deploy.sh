#!/bin/bash

# Manual deployment script for ToDo App
# Usage: ./deploy.sh [server_ip] [ssh_key_path]
#
# DATABASE ORGANIZATION:
# =====================
# Production Database: /opt/todo-app/databases/production/todo-app.db
# Backup Directory:    /opt/todo-app/databases/backups/
# Database Manager:    ./database-manager.sh
#
# IMPORTANT DATABASE NOTES:
# - The production database is located at: databases/production/todo-app.db
# - Backups are automatically created with timestamp: todo-app-backup-YYYYMMDD-HHMMSS.db
# - Use ./database-manager.sh backup to create manual backups
# - Use ./database-manager.sh status to check database status
# - Use ./database-manager.sh restore <file> to restore from backup
# - Old backup directories are automatically cleaned up during deployment
#
# DEPLOYMENT PROCESS:
# 1. Creates backup of current deployment
# 2. Extracts new code to /opt/todo-app/current/
# 3. Installs dependencies
# 4. Sets up systemd service (runs src/backend/server.js)
# 5. Configures nginx reverse proxy
# 6. Starts the service

set -e

SERVER_IP=${1:-"92.204.40.235"}
SSH_KEY=${2:-"~/.ssh/id_rsa"}
APP_DIR="/opt/todo-app"
SERVICE_NAME="todo-app"

echo "🚀 Starting deployment to $SERVER_IP..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."
rm -rf deploy
mkdir -p deploy

# Copy necessary files
cp -r src deploy/
cp -r public deploy/
cp -r config deploy/
cp package*.json deploy/
cp server.js deploy/
# Create production env file
cat > deploy/.env << 'ENV_EOF'
# Production Environment Configuration for Todo App

# Server Configuration
PORT=3000
NODE_ENV=production

# JWT Configuration - CHANGE THIS IN PRODUCTION!
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Database Configuration
DATABASE_PATH=/opt/todo-app/data/data.db

# CORS Configuration - Update with your actual domain
FRONTEND_URL=https://your-domain.com

# Cache Configuration
CACHE_CONTROL=no-cache

# Security
BCRYPT_ROUNDS=12
ENV_EOF

# Create deployment archive
tar -czf todo-app-deploy.tar.gz -C deploy .

echo "📤 Uploading to server..."

# Upload and extract on server
scp -i "$SSH_KEY" todo-app-deploy.tar.gz root@$SERVER_IP:/tmp/
ssh -i "$SSH_KEY" root@$SERVER_IP << EOF
    set -e
    
    echo "📁 Setting up directories..."
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Stop service if running
    systemctl stop $SERVICE_NAME || true
    
    # Setup database directory structure
    echo "🗄️  Setting up database structure..."
    mkdir -p databases/production databases/backups
    
    # Backup current deployment and database
    if [ -d "current" ]; then
        mv current backup-\$(date +%Y%m%d-%H%M%S)
    fi
    
    # Create database backup if production database exists
    if [ -f "databases/production/todo-app.db" ]; then
        echo "📦 Creating database backup..."
        cp databases/production/todo-app.db databases/backups/todo-app-backup-\$(date +%Y%m%d-%H%M%S).db
        echo "✅ Database backed up"
    fi
    
    # Extract new deployment
    mkdir -p current
    cd current
    tar -xzf /tmp/todo-app-deploy.tar.gz
    rm /tmp/todo-app-deploy.tar.gz
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    npm ci --production
    
    # Set permissions
    chmod +x server.js
    chown -R www-data:www-data $APP_DIR
    
    # Copy database manager script
    echo "📋 Installing database manager..."
    cp database-manager.sh $APP_DIR/
    chmod +x $APP_DIR/database-manager.sh
    
    # Create systemd service
    echo "⚙️  Setting up systemd service..."
    cat > /etc/systemd/system/$SERVICE_NAME.service << 'SERVICE_EOF'
[Unit]
Description=ToDo App
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR/current
ExecStart=/usr/bin/node src/backend/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=JWT_SECRET=\$(openssl rand -hex 32)
Environment=FRONTEND_URL=https://your-domain.com

[Install]
WantedBy=multi-user.target
SERVICE_EOF
    
    # Reload and start service
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    systemctl start $SERVICE_NAME
    
    # Setup nginx reverse proxy (only if not already configured)
    echo "🌐 Setting up nginx..."
    if [ ! -f "/etc/nginx/sites-available/$SERVICE_NAME" ]; then
        cat > /etc/nginx/sites-available/$SERVICE_NAME << 'NGINX_EOF'
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_EOF
    else
        echo "✅ Nginx configuration already exists, preserving SSL setup"
    fi
    
    # Enable nginx site (only if not already enabled)
    if [ ! -L "/etc/nginx/sites-enabled/$SERVICE_NAME" ]; then
        ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/
    fi
    nginx -t && systemctl reload nginx
    
    # Clean up old database structure
    echo "🧹 Cleaning up old database structure..."
    if [ -f "current/data.db" ]; then
        rm -f current/data.db
        echo "✅ Removed old data.db from current/"
    fi
    if [ -f "data/data.db" ]; then
        rm -f data/data.db
        echo "✅ Removed old data.db from data/"
    fi
    
    # Clean up old backup directories (keep only last 5)
    echo "🗑️  Cleaning up old backup directories..."
    cd $APP_DIR
    ls -dt backup-* 2>/dev/null | tail -n +6 | xargs -r rm -rf
    echo "✅ Old backup directories cleaned up"
    
    # Check service status
    echo "✅ Checking service status..."
    systemctl status $SERVICE_NAME --no-pager
    
    echo "🎉 Deployment completed successfully!"
    echo "🌐 Your app should be available at http://$SERVER_IP"
    echo "🗄️  Database location: $APP_DIR/databases/production/todo-app.db"
    echo "📋 Use './database-manager.sh status' to check database status"
EOF

# Cleanup
rm -rf deploy todo-app-deploy.tar.gz

echo "✅ Deployment completed!"
echo "🌐 Your ToDo app is now running at http://$SERVER_IP"
echo "📝 Don't forget to:"
echo "   1. Update your domain name in nginx config"
echo "   2. Set up SSL certificate with Let's Encrypt"
echo "   3. Update JWT_SECRET in production"
