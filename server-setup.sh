#!/bin/bash

# Server setup script for ToDo App
# Run this on your server before first deployment

set -e

echo "🔧 Setting up server for ToDo App deployment..."

# Update system
apt update && apt upgrade -y

# Install build tools first
apt install -y build-essential python3 make g++

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install nginx
apt install -y nginx

# Install PM2 for process management (alternative to systemd)
npm install -g pm2

# Create app user and directories
useradd -r -s /bin/false www-data || true
mkdir -p /opt/todo-app/data
chown -R www-data:www-data /opt/todo-app

# Install SSL tools
apt install -y certbot python3-certbot-nginx

# Configure firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Start nginx
systemctl enable nginx
systemctl start nginx

echo "✅ Server setup completed!"
echo "📝 Next steps:"
echo "   1. Set up your domain DNS to point to this server"
echo "   2. Run the deployment script from your local machine"
echo "   3. Configure SSL certificate with: certbot --nginx -d your-domain.com"
