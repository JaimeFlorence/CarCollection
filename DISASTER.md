# Car Collection Deployment Disaster Recovery Documentation

**Date**: January 11, 2025  
**Issue**: "Something went wrong!" error preventing access to deployed application  
**Status**: UNRESOLVED - Application deployed but frontend shows error page

## Summary of the Issue

After deployment to VPS at http://93.127.194.202, the application shows "Something went wrong!" error page when accessed. All services are running, API is functional, but the React frontend encounters an error that triggers the error boundary.

## System Status (As of last check)

### ✅ Working Components
- **Backend API**: Running on port 8000, authentication works
- **Frontend Service**: Running on port 3001
- **Nginx**: Running and routing correctly
- **Database**: SQLite database is accessible and writable
- **API Endpoints**: All endpoints respond correctly when tested directly

### ❌ Not Working
- **Homepage**: Shows "Something went wrong!" error
- **Car Creation**: Cannot test due to unable to access UI
- **User Management**: Cannot test due to unable to access UI

## Deployment Configuration

### Server Details
- **IP**: 93.127.194.202
- **OS**: Ubuntu 24.04.2 LTS
- **Admin Credentials**: 
  - Username: `Administrator`
  - Password: `Tarzan7Jane`

### Service Configuration
- **Backend**: FastAPI running via Gunicorn on localhost:8000
- **Frontend**: Next.js 15 running on localhost:3001
- **Nginx**: Reverse proxy on port 80
- **Database**: SQLite at `/opt/carcollection/backend/car_collection.db`

### Environment Variables
**Backend (.env)**:
```
DATABASE_URL=sqlite:///./car_collection.db
SECRET_KEY=1d247327682c9061e369ed897a62970e350bf63a53304e6b407feacba202d635
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=4
CORS_ORIGINS=["http://93.127.194.202"]
ENVIRONMENT=production
DEBUG=False
INVITATION_EXPIRY_DAYS=7
ALLOW_REGISTRATION=False
FRONTEND_URL=http://93.127.194.202
```

**Frontend (.env.production)**:
```
NEXT_PUBLIC_API_URL=http://93.127.194.202
NEXT_PUBLIC_APP_NAME=Car Collection Manager
NEXT_PUBLIC_ENABLE_REGISTRATION=false
NEXT_PUBLIC_ENABLE_INVITATIONS=true
```

## Issues Encountered and Fixes Applied

### 1. Initial Database Permission Issue (RESOLVED)
**Symptom**: Thought database was read-only  
**Actual Issue**: API routes were misconfigured  
**Scripts Created**: 
- `check-db-permissions.sh`
- `fix-db-permissions.sh`

### 2. BCrypt Compatibility Warning (RESOLVED)
**Issue**: `AttributeError: module 'bcrypt' has no attribute '__about__'`  
**Fix**: Updated bcrypt and passlib versions  
**Script**: `fix-bcrypt-issue.sh`

### 3. API Route Prefix Issue (RESOLVED)
**Issue**: Car endpoints were at `/cars/` instead of `/api/cars/`  
**Fix**: Created routers and moved endpoints to use `/api/` prefix  
**Script**: `fix-api-routes.sh`

### 4. Main.py Syntax Error (RESOLVED)
**Issue**: Unmatched parenthesis on line 147  
**Fix**: Fixed syntax and restored working configuration  
**Scripts**: 
- `fix-syntax-error.sh`
- `fix-main-py-syntax.sh`

### 5. Missing pydantic_settings Module (RESOLVED)
**Issue**: `ModuleNotFoundError: No module named 'pydantic_settings'`  
**Fix**: Installed pydantic-settings package  
**Script**: `fix-pydantic-settings.sh`

### 6. Missing SECRET_KEY Configuration (RESOLVED)
**Issue**: SECRET_KEY was not set in production  
**Fix**: Updated .env with proper SECRET_KEY  
**Script**: `update-secret-key.sh`

### 7. Frontend localhost References (RESOLVED)
**Issue**: Frontend had hardcoded localhost:8000 references  
**Fix**: Rebuilt frontend with correct API URL  
**Script**: `rebuild-frontend.sh`

### 8. Double /api/ in Todo Endpoints (RESOLVED)
**Issue**: Todo endpoints had `/api/cars/${carId}/api/todos/`  
**Fix**: Corrected to `/api/cars/${carId}/todos/`  
**Script**: `fix-double-api-paths.sh`

### 9. Frontend API Path Mismatch (RESOLVED)
**Issue**: Frontend calling `/cars/` instead of `/api/cars/`  
**Fix**: Updated all API paths in frontend to use `/api/` prefix  
**Script**: `fix-frontend-api-paths.sh`

### 10. Homepage Redirect Conflict (ATTEMPTED)
**Issue**: Homepage uses ProtectedRoute while redirecting to dashboard  
**Status**: Fix created but not tested  
**Script**: `fix-homepage-redirect.sh`

## Current State Analysis

### What We Know Works
1. **Backend API**:
   ```bash
   curl -X POST http://93.127.194.202/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username": "Administrator", "password": "Tarzan7Jane"}'
   # Returns valid JWT token
   ```

2. **API Endpoints**:
   - `/api/cars/` - Returns 200 with auth
   - `/api/invitations/` - Returns 307 (redirect)
   - `/api/cars/{id}/todos/` - Returns 200

3. **Frontend Build**:
   - Build completes successfully
   - No localhost references in build
   - Correct API paths after fixes

### The Problem
The React application loads but immediately shows "Something went wrong!" error page. This is caught by the Next.js error boundary at:
```
.next/static/chunks/app/error-0696c9bc38a776f7.js
```

### Root Cause Analysis
The homepage (`src/app/page.tsx`) contains:
```javascript
export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    router.push('/dashboard');
  }, [router]);
  
  return (
    <ProtectedRoute>
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    </ProtectedRoute>
  );
}
```

This creates a conflict:
1. The page is wrapped in `ProtectedRoute` (which checks authentication)
2. But also immediately redirects to `/dashboard`
3. This likely causes a race condition or hydration error

## Diagnostic Scripts Created

1. **diagnose-car-creation.sh** - Comprehensive API testing
2. **test-car-creation.py** - Python script to test car creation via API
3. **check-backend-status.sh** - Backend service diagnostics
4. **safe-debug-api.sh** - Safe API debugging without code changes
5. **check-frontend-errors.sh** - Frontend error checking
6. **full-diagnostic.sh** - Complete system diagnostic
7. **test-react-error.sh** - React-specific error testing

## What to Try Next

1. **Access login page directly**: http://93.127.194.202/login
   - This bypasses the problematic homepage
   - Login page HTML loads correctly in tests

2. **Clear all browser storage**:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

3. **Run the homepage fix**:
   ```bash
   ./fix-homepage-redirect.sh
   ```

4. **Check for client-side errors**:
   - Browser console errors (F12)
   - Network tab for failed requests
   - React Developer Tools for component errors

5. **Test in development mode**:
   ```bash
   cd /opt/carcollection/car-collection-prototype
   npm run dev
   ```
   This will show detailed error messages

## Relevant File Locations

**Backend**:
- Main app: `/opt/carcollection/backend/app/main.py`
- API routes: `/opt/carcollection/backend/app/car_api.py`, `todo_api.py`
- Database: `/opt/carcollection/backend/car_collection.db`

**Frontend**:
- Homepage: `/opt/carcollection/car-collection-prototype/src/app/page.tsx`
- API client: `/opt/carcollection/car-collection-prototype/src/lib/api.ts`
- Auth context: `/opt/carcollection/car-collection-prototype/src/contexts/AuthContext.tsx`

**Configuration**:
- Nginx: `/etc/nginx/sites-enabled/carcollection`
- Backend service: `/etc/systemd/system/carcollection-backend.service`
- Frontend service: `/etc/systemd/system/carcollection-frontend.service`

## Commands for Troubleshooting

```bash
# Check all services
systemctl status carcollection-backend carcollection-frontend nginx

# View logs
journalctl -u carcollection-backend -f
journalctl -u carcollection-frontend -f
tail -f /var/log/nginx/error.log

# Test API
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "Administrator", "password": "Tarzan7Jane"}'

# Restart everything
systemctl restart carcollection-backend carcollection-frontend nginx

# Check what's actually being served
curl http://93.127.194.202/ | grep -i error
```

## Theory of the Problem

The issue appears to be a client-side React/Next.js error, likely caused by:
1. The homepage's conflicting use of ProtectedRoute while redirecting
2. A hydration mismatch between server and client
3. Authentication context initialization issues
4. Possible race condition in the routing logic

The fact that all backend services work correctly and the HTML is served properly indicates this is purely a frontend JavaScript execution issue.

## Next Steps for Resolution

1. Try accessing the login page directly to bypass the homepage
2. If that works, fix the homepage redirect logic
3. If that doesn't work, run the app in development mode to see the actual error
4. Consider simplifying the authentication flow
5. Check for any browser-specific issues (try different browsers)

All diagnostic scripts are in `/home/jaime/MyCode/src/CarCollection/deployment/` and on the server at `/opt/carcollection/`.

---

**Last Updated**: January 11, 2025, 04:55 UTC