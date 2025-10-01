# Database Admin Interface Deployment Guide

This guide covers how to deploy and secure the database admin interface.

## Quick Deployment

```bash
# From your local machine, in the project directory
./deploy-db-admin.sh 92.204.40.235 ~/.ssh/id_rsa
```

## Manual Setup

If you prefer to set it up manually or the script fails:

### 1. Upload db-admin.js to Server

```bash
scp db-admin.js root@92.204.40.235:/opt/todo-app/current/
```

### 2. Create Systemd Service

SSH into your server and create the service file:

```bash
ssh root@92.204.40.235

cat > /etc/systemd/system/todo-db-admin.service << 'EOF'
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
EOF

systemctl daemon-reload
systemctl enable todo-db-admin
systemctl start todo-db-admin
systemctl status todo-db-admin
```

### 3. Configure Nginx

```bash
# Copy the nginx configuration
cat > /etc/nginx/sites-available/todo-db-admin << 'EOF'
server {
    listen 80;
    server_name admin.todo.florianbolli.ch;
    
    location / {
        proxy_pass http://localhost:8083;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/todo-db-admin /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 4. Configure DNS

Make sure your DNS has an A record:
```
admin.todo.florianbolli.ch -> 92.204.40.235
```

### 5. Setup SSL Certificate

```bash
sudo certbot --nginx -d admin.todo.florianbolli.ch
```

## Security Setup (REQUIRED!)

⚠️ **WARNING**: The database admin interface should NEVER be publicly accessible without authentication!

### Option 1: HTTP Basic Authentication (Recommended)

```bash
# Install apache2-utils
sudo apt install apache2-utils

# Create password file (it will prompt for password)
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Add more users if needed (without -c flag)
sudo htpasswd /etc/nginx/.htpasswd another_user

# Update nginx configuration
sudo nano /etc/nginx/sites-available/todo-db-admin

# Add these lines inside the server block:
#   auth_basic "Database Admin";
#   auth_basic_user_file /etc/nginx/.htpasswd;

# Reload nginx
sudo systemctl reload nginx
```

### Option 2: IP Restriction

```bash
sudo nano /etc/nginx/sites-available/todo-db-admin

# Add these lines inside the location block:
#   allow 1.2.3.4;      # Your IP address
#   allow 5.6.7.8;      # Another allowed IP
#   deny all;

# Reload nginx
sudo systemctl reload nginx
```

### Option 3: VPN Only Access

Set up a VPN (like WireGuard) and only allow access through VPN IPs.

## Accessing the Admin Interface

Once deployed and secured:
1. Visit https://admin.todo.florianbolli.ch
2. Enter your credentials (if HTTP Basic Auth is enabled)
3. View database statistics and data
4. Execute read-only SQL queries

## Features

- **Dashboard**: View counts of accounts, todos, and categories
- **Data Browser**: Browse accounts, todos, and categories
- **SQL Console**: Execute custom SELECT queries
- **Real-time Stats**: See current database state

## Service Management

```bash
# Check status
sudo systemctl status todo-db-admin

# View logs
sudo journalctl -u todo-db-admin -f

# Restart
sudo systemctl restart todo-db-admin

# Stop
sudo systemctl stop todo-db-admin
```

## Troubleshooting

### Service won't start

```bash
# Check logs
sudo journalctl -u todo-db-admin --no-pager

# Check if port 8083 is in use
sudo lsof -i :8083

# Check file permissions
sudo chown -R www-data:www-data /opt/todo-app
```

### Can't access via domain

```bash
# Check nginx status
sudo systemctl status nginx

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test nginx configuration
sudo nginx -t

# Check if service is running
curl http://localhost:8083
```

### Database locked errors

```bash
# This usually means the main app and admin are competing
# Make sure to use WAL mode (Write-Ahead Logging)
# The db-admin.js already handles this correctly
```

## Security Best Practices

1. ✅ **Always use HTTPS** (SSL certificate)
2. ✅ **Enable HTTP Basic Authentication** or IP restrictions
3. ✅ **Use strong passwords** for basic auth
4. ✅ **Monitor access logs** regularly
5. ✅ **Only allow SELECT queries** (already implemented)
6. ✅ **Keep Node.js and packages updated**
7. ⚠️ **Never expose without authentication**
8. ⚠️ **Consider VPN-only access** for maximum security

## Updating the Admin Interface

If you make changes to db-admin.js:

```bash
# Run the deployment script again
./deploy-db-admin.sh

# Or manually
scp db-admin.js root@92.204.40.235:/opt/todo-app/current/
ssh root@92.204.40.235 "systemctl restart todo-db-admin"
```

## Removing the Admin Interface

If you want to remove it:

```bash
ssh root@92.204.40.235

# Stop and disable service
sudo systemctl stop todo-db-admin
sudo systemctl disable todo-db-admin
sudo rm /etc/systemd/system/todo-db-admin.service
sudo systemctl daemon-reload

# Remove nginx config
sudo rm /etc/nginx/sites-enabled/todo-db-admin
sudo rm /etc/nginx/sites-available/todo-db-admin
sudo systemctl reload nginx

# Revoke SSL certificate (optional)
sudo certbot revoke --cert-name admin.todo.florianbolli.ch
```

