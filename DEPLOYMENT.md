# ToDo App Deployment Guide

This guide covers two deployment options for your ToDo application.

## Option 1: GitHub CI/CD (Recommended)

### Prerequisites
1. Push your code to a GitHub repository
2. Set up the following secrets in your GitHub repository:
   - `SERVER_HOST`: Your server IP (92.204.40.235)
   - `SERVER_USER`: SSH username (root)
   - `SERVER_SSH_KEY`: Your private SSH key content
   - `JWT_SECRET`: A strong secret key for JWT tokens

### Setup Steps

1. **First-time server setup:**
   ```bash
   # SSH into your server
   ssh root@92.204.40.235
   
   # Run the setup script
   curl -sSL https://raw.githubusercontent.com/your-username/your-repo/main/server-setup.sh | bash
   ```

2. **Configure GitHub Secrets:**
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Add the required secrets listed above

3. **Deploy:**
   - Push to main/master branch
   - GitHub Actions will automatically deploy your app

## Option 2: Manual Deployment

### Quick Deploy
```bash
# Make sure you're in the project directory
cd /home/florian/Programs/ToDo

# Run the deployment script
./deploy.sh 92.204.40.235 ~/.ssh/id_rsa
```

### Manual Steps
1. **Server setup:**
   ```bash
   ssh root@92.204.40.235
   # Run server-setup.sh or manually install Node.js, nginx, etc.
   ```

2. **Deploy application:**
   ```bash
   # From your local machine
   ./deploy.sh
   ```

## Post-Deployment Configuration

### 1. Domain Setup
Update nginx configuration with your domain:
```bash
# Edit nginx config
sudo nano /etc/nginx/sites-available/todo-app

# Replace 'your-domain.com' with your actual domain
# Then reload nginx
sudo systemctl reload nginx
```

### 2. SSL Certificate
```bash
# Install SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

### 3. Environment Variables
Update production environment:
```bash
sudo nano /opt/todo-app/current/.env

# Update:
# - JWT_SECRET (generate a strong secret)
# - FRONTEND_URL (your actual domain)
# - Any other production-specific settings
```

## Service Management

### Check Status
```bash
sudo systemctl status todo-app
```

### View Logs
```bash
sudo journalctl -u todo-app -f
```

### Restart Service
```bash
sudo systemctl restart todo-app
```

### Update Application
- **With GitHub CI/CD**: Push to main branch
- **Manual**: Run `./deploy.sh` again

## Database Management

Your SQLite database is stored at:
- Development: `./data.db`
- Production: `/opt/todo-app/data/data.db`

### Backup Database
```bash
# On production server
sudo cp /opt/todo-app/data/data.db /opt/todo-app/backups/data-$(date +%Y%m%d).db
```

### Restore Database
```bash
# Stop service first
sudo systemctl stop todo-app

# Restore database
sudo cp /path/to/backup.db /opt/todo-app/data/data.db

# Set proper permissions
sudo chown www-data:www-data /opt/todo-app/data/data.db

# Start service
sudo systemctl start todo-app
```

## Monitoring

### Health Check
```bash
# Check if app is responding
curl http://localhost:3000/api/health

# Check nginx
curl http://your-domain.com
```

### Performance Monitoring
```bash
# Check system resources
htop

# Check nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Common Issues

1. **Service won't start:**
   ```bash
   sudo journalctl -u todo-app --no-pager
   ```

2. **Permission issues:**
   ```bash
   sudo chown -R www-data:www-data /opt/todo-app
   ```

3. **Port already in use:**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

4. **Database locked:**
   ```bash
   sudo systemctl stop todo-app
   # Wait a moment
   sudo systemctl start todo-app
   ```

## Security Considerations

1. **Change default JWT secret** in production
2. **Use HTTPS** (SSL certificate)
3. **Keep system updated** regularly
4. **Monitor logs** for suspicious activity
5. **Backup database** regularly
6. **Use strong passwords** for server access

## Scaling Considerations

For future scaling:
- Consider PostgreSQL instead of SQLite for multiple servers
- Add load balancer for multiple app instances
- Use Redis for session management
- Implement proper logging and monitoring
