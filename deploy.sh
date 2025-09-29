#!/bin/bash

# Manual deployment script for ToDo App
# Usage: ./deploy.sh [server_ip] [ssh_key_path]

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
cp .env.production deploy/.env

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
    
    # Backup current deployment
    if [ -d "current" ]; then
        mv current backup-\$(date +%Y%m%d-%H%M%S)
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
ExecStart=/usr/bin/node server.js
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
    
    # Setup nginx reverse proxy
    echo "🌐 Setting up nginx..."
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
    
    # Enable nginx site
    ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/
    nginx -t && systemctl reload nginx
    
    # Check service status
    echo "✅ Checking service status..."
    systemctl status $SERVICE_NAME --no-pager
    
    echo "🎉 Deployment completed successfully!"
    echo "🌐 Your app should be available at http://$SERVER_IP"
EOF

# Cleanup
rm -rf deploy todo-app-deploy.tar.gz

echo "✅ Deployment completed!"
echo "🌐 Your ToDo app is now running at http://$SERVER_IP"
echo "📝 Don't forget to:"
echo "   1. Update your domain name in nginx config"
echo "   2. Set up SSL certificate with Let's Encrypt"
echo "   3. Update JWT_SECRET in production"
