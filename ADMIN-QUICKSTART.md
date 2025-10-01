# Quick Start: Database Admin Setup

## 🚀 Deploy to Server

Run this from your local machine:

```bash
./deploy-db-admin.sh 92.204.40.235 ~/.ssh/id_rsa
```

## 🌐 Setup DNS

Add an A record to your DNS:
```
Type: A
Name: admin.todo
Host: @
Value: 92.204.40.235
TTL: 3600
```

Or if using a subdomain:
```
Type: A  
Name: admin
Host: todo.florianbolli.ch
Value: 92.204.40.235
```

## 🔒 Setup SSL (on server)

SSH into your server and run:

```bash
ssh root@92.204.40.235

# Install SSL certificate
sudo certbot --nginx -d admin.todo.florianbolli.ch

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🔐 Add Authentication (REQUIRED!)

Still on the server:

```bash
# Install password tools
sudo apt install apache2-utils

# Create admin user (you'll be prompted for password)
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Edit nginx config to enable auth
sudo nano /etc/nginx/sites-available/todo-db-admin

# Uncomment these two lines:
#   auth_basic "Database Admin";
#   auth_basic_user_file /etc/nginx/.htpasswd;

# Reload nginx
sudo systemctl reload nginx
```

## ✅ Test It

1. Visit: https://admin.todo.florianbolli.ch
2. Enter your username and password
3. View your production database!

## 🛠️ Useful Commands

```bash
# Check if service is running
sudo systemctl status todo-db-admin

# View logs
sudo journalctl -u todo-db-admin -f

# Restart service
sudo systemctl restart todo-db-admin

# Check nginx config
sudo nginx -t

# Test local access (on server)
curl http://localhost:8083
```

## ⚠️ Security Checklist

- [ ] DNS pointing to server
- [ ] SSL certificate installed
- [ ] HTTP Basic Auth enabled
- [ ] Strong password set
- [ ] Tested access from browser
- [ ] Confirmed authentication is working

## 📝 Quick Reference

| Item | Value |
|------|-------|
| Domain | admin.todo.florianbolli.ch |
| Server IP | 92.204.40.235 |
| Internal Port | 8083 |
| Service Name | todo-db-admin |
| Database Path | /opt/todo-app/data/data.db |
| Nginx Config | /etc/nginx/sites-available/todo-db-admin |

---

**Need help?** Check [DB-ADMIN-DEPLOYMENT.md](DB-ADMIN-DEPLOYMENT.md) for detailed instructions.

