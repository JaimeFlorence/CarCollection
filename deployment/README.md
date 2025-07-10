# Car Collection Deployment Quick Start

## 🚀 Quick Deployment to VPS (93.127.194.202)

### Option 1: Using Quick Setup Script (Recommended)

1. **Upload the deployment folder to your VPS** via FTP or SSH:
   ```bash
   scp -r deployment/ root@93.127.194.202:/tmp/
   ```

2. **SSH into your VPS**:
   ```bash
   ssh root@93.127.194.202
   ```

3. **Run the quick setup script**:
   ```bash
   cd /tmp/deployment
   chmod +x quick-setup.sh
   ./quick-setup.sh
   ```

4. **Follow the prompts** to:
   - Set password for carcollection user
   - Create admin account
   - Note down the generated SECRET_KEY

5. **Access your application**:
   - Open http://93.127.194.202 in your browser
   - Login with your admin credentials

### Option 2: Using GitHub

1. **Fork or push this repository to your GitHub account**

2. **SSH into your VPS**:
   ```bash
   ssh root@93.127.194.202
   ```

3. **Run these commands**:
   ```bash
   # Update the REPO_URL in the script first!
   wget https://raw.githubusercontent.com/yourusername/CarCollection/main/deployment/quick-setup.sh
   chmod +x quick-setup.sh
   ./quick-setup.sh
   ```

## 📧 Inviting Users

### Via Admin Panel (Easy Way)
1. Login as admin at http://93.127.194.202
2. Go to Admin panel
3. Click on "Create New Invitation"
4. Enter friend's email address
5. Click "Create Invitation"
6. Copy the invitation URL and send it to them

### Via Email
1. After creating an invitation, click the email icon
2. Your email client will open with a pre-filled message
3. Send the email to your friend/family member

## 🔒 Security Notes

- The app is configured for **invitation-only** registration
- Public registration is disabled by default
- All users have isolated data (multi-tenancy)
- Passwords are hashed with bcrypt
- JWT tokens expire after 4 hours

## 🛠️ Common Tasks

### Check Service Status
```bash
sudo systemctl status carcollection-backend
sudo systemctl status carcollection-frontend
```

### View Logs
```bash
# Backend logs
sudo journalctl -u carcollection-backend -f

# Frontend logs  
sudo journalctl -u carcollection-frontend -f
```

### Restart Services
```bash
sudo systemctl restart carcollection-backend carcollection-frontend
```

### Update Application
```bash
cd /opt/carcollection
git pull
./deployment/deploy.sh
```

## 📝 Configuration Files

- Backend config: `/opt/carcollection/backend/.env`
- Frontend config: `/opt/carcollection/car-collection-prototype/.env.local`
- Nginx config: `/etc/nginx/sites-available/carcollection`

## 🚨 Troubleshooting

If the site shows "502 Bad Gateway":
1. Check backend is running: `sudo systemctl status carcollection-backend`
2. Check logs: `sudo journalctl -u carcollection-backend -n 50`

If you can't create invitations:
1. Make sure you're logged in as admin
2. Check browser console for errors
3. Verify backend is running

## 📚 Full Documentation

For detailed deployment instructions, SSL setup, and advanced configuration, see [DEPLOYMENT.md](../DEPLOYMENT.md)