# Admin API Fix Documentation

**Date**: January 11, 2025  
**Issue**: Admin page on staging server showed "Failed to load users" error  
**Root Cause**: Multiple configuration issues with API routing and CORS

## Summary of Issues Found and Fixed

### 1. Frontend API URL Configuration
**Problem**: The `axiosClient.ts` file had the API base URL hardcoded to `http://localhost:8000`

**Fix**: Updated to use environment variable:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
```

**Files Modified**:
- `/car-collection-prototype/src/lib/axiosClient.ts`
- Created `/car-collection-prototype/.env.production` with `NEXT_PUBLIC_API_URL=http://93.127.194.202`

### 2. Nginx Routing Configuration
**Problem**: Nginx was missing routes for `/admin/users/` API endpoints

**Fix**: Added specific routing for admin API endpoints:
```nginx
# Admin API endpoints - only the API calls, not the page
location /admin/users/ {
    proxy_pass http://localhost:8000/admin/users/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

**Important**: The `/admin` page itself is handled by the frontend (Next.js), while `/admin/users/` API calls are proxied to the backend.

### 3. CORS Configuration ✅ (Final Fix)
**Problem**: Backend CORS configuration wasn't allowing requests from the staging server IP

**Symptoms**:
- Browser console showed "Network Error" with code "ERR_NETWORK"
- Requests were blocked by browser CORS policy
- API worked fine when tested with curl but failed in browser

**Fix**: Updated CORS origins in backend `.env` file:
```
CORS_ORIGINS=["http://93.127.194.202","http://localhost:3000","http://localhost:3001"]
```

## Scripts Created for Troubleshooting and Fixes

1. **`diagnose-admin-api.sh`** - Comprehensive diagnostic script that checks:
   - Backend and frontend service status
   - Direct API endpoint testing
   - Nginx configuration
   - Database contents
   - Environment variables

2. **`fix-nginx-correct.sh`** - Fixes nginx routing to properly handle:
   - Frontend routes (like `/admin`) → Next.js
   - API routes (like `/admin/users/`) → FastAPI backend

3. **`fix-cors-issue.sh`** - Updates CORS configuration in backend:
   - Modifies `.env` file with correct CORS_ORIGINS
   - Restarts backend service
   - Tests CORS headers

4. **`test-staging-api.py`** - Python script to test API endpoints from local machine

## Deployment Steps for Future Reference

When deploying to a new server or updating the staging server:

1. **Ensure Frontend Uses Correct API URL**:
   ```bash
   # In car-collection-prototype/
   echo "NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP" > .env.production
   npm run build
   ```

2. **Configure Nginx Properly**:
   - Frontend routes go to Next.js (port 3001)
   - `/auth/`, `/api/`, `/admin/users/`, `/data/` go to FastAPI (port 8000)

3. **Set CORS Origins in Backend**:
   ```bash
   # In backend/.env
   CORS_ORIGINS=["http://YOUR_SERVER_IP","http://localhost:3000"]
   ```

4. **Always Test After Deployment**:
   - Clear browser cache
   - Check browser console for errors
   - Use network tab to inspect failed requests
   - Run diagnostic scripts if issues occur

## Key Lessons Learned

1. **Environment Variables**: Never hardcode URLs in production code. Always use environment variables.

2. **CORS is Critical**: Browser security requires proper CORS headers. What works with curl might fail in browsers.

3. **Nginx Routing**: Be careful to distinguish between frontend routes and API endpoints in nginx configuration.

4. **Build Process**: After changing environment variables, always rebuild the frontend to include the new values.

5. **Debugging Order**:
   - First check if the API works directly (curl/postman)
   - Then check nginx routing
   - Finally check browser-specific issues (CORS)

## Testing the Fix

After applying all fixes:

1. Access http://93.127.194.202/admin
2. You should see the Administrator user listed
3. Creating new users should work
4. Check browser console - no errors should appear

## Backup of Working Configuration

The working configuration has been tested and verified on January 11, 2025. The key files are:

- **Nginx**: `/etc/nginx/sites-available/carcollection` (with admin API routing)
- **Backend**: `.env` with proper CORS_ORIGINS
- **Frontend**: Built with `NEXT_PUBLIC_API_URL=http://93.127.194.202`

This documentation serves as a reference for future deployments and troubleshooting.