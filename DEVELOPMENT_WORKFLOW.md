# Development and Deployment Workflow

This document explains how to develop locally and deploy to production without conflicts.

## Local Development

### Initial Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/CarCollection.git
cd CarCollection

# Run the local setup script
chmod +x setup-local-dev.sh
./setup-local-dev.sh
```

### Daily Development
```bash
# Terminal 1: Start backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Start frontend
cd car-collection-prototype
npm run dev
```

- Access at: http://localhost:3000
- Login: admin / admin123

### Making Changes
1. Make your code changes
2. Test locally
3. Commit and push to GitHub
4. Deployment happens automatically (if configured)

## Production Deployment

### Initial VPS Setup
1. Set up your VPS with Ubuntu 22.04+
2. Run initial setup from DEPLOYMENT.md
3. Clone the repository to `/opt/carcollection`

### Configure GitHub Deployment
1. Generate deployment files:
   ```bash
   chmod +x deployment/prepare-for-deployment.sh
   ./deployment/prepare-for-deployment.sh YOUR_VPS_IP
   ```

2. Add GitHub secrets:
   - Go to GitHub repo → Settings → Secrets → Actions
   - Add:
     - `VPS_HOST`: Your server IP
     - `VPS_USER`: root
     - `VPS_SSH_KEY`: Your SSH private key

3. Push to main branch to trigger deployment

### Manual Deployment
If you need to deploy manually:
```bash
ssh root@YOUR_VPS_IP
cd /opt/carcollection
git pull origin main
./deployment/deploy-to-vps.sh
```

## Environment Configuration

### Local Development
- Backend: `backend/.env` (created by setup-local-dev.sh)
  - Uses SQLite
  - CORS allows localhost:3000
  - Debug mode enabled
  
- Frontend: `car-collection-prototype/.env.local`
  - API URL: http://localhost:8000
  - Registration enabled

### Production
- Backend: `backend/.env` (created during deployment)
  - Uses SQLite (or PostgreSQL)
  - CORS allows server IP only
  - Debug mode disabled
  
- Frontend: Built with production env
  - API URL: http://YOUR_VPS_IP
  - Registration disabled (invitation only)

## Key Principles

1. **Never hardcode URLs** - Always use environment variables
2. **Separate environments** - Local .env files are different from production
3. **Use GitHub for deployment** - Avoid manual file copying
4. **Test locally first** - Ensure changes work before pushing
5. **Clean deployment** - The deployment script handles environment setup

## Troubleshooting

### Local Development Issues
- **Backend won't start**: Check Python virtual environment is activated
- **Frontend won't start**: Run `npm install` to ensure dependencies
- **Can't login**: Database might need initialization, run setup script

### Production Issues
- **Login spinning**: Clear browser cache, check for localhost references
- **502 errors**: Check if services are running with `systemctl status`
- **Changes not appearing**: Ensure deployment completed, check logs

## Important Files

### Configuration Files
- `setup-local-dev.sh` - Sets up local development
- `deployment/prepare-for-deployment.sh` - Prepares deployment files
- `deployment/deploy-to-vps.sh` - Runs on VPS during deployment
- `.github/workflows/deploy.yml` - GitHub Actions deployment

### Environment Files (git-ignored)
- `backend/.env` - Backend configuration
- `car-collection-prototype/.env.local` - Frontend local config
- `car-collection-prototype/.env.production` - Frontend production config

## Best Practices

1. **Always test locally** before pushing to production
2. **Use feature branches** for major changes
3. **Keep secrets secure** - Never commit .env files
4. **Monitor logs** after deployment
5. **Backup database** before major updates

## Quick Commands

### Local Development
```bash
# Start everything
./start-local.sh  # You can create this

# Reset local database
cd backend && rm car_collection.db && python init_db.py
```

### Production
```bash
# Check service status
ssh root@VPS_IP 'systemctl status carcollection-backend carcollection-frontend'

# View logs
ssh root@VPS_IP 'journalctl -u carcollection-backend -f'

# Restart services
ssh root@VPS_IP 'systemctl restart carcollection-backend carcollection-frontend'
```