# Session Management Testing Guide

## Overview
We've implemented comprehensive session management with the following features:

### 1. **Automatic 401 Handling** ✅
- Any 401 error will show a toast notification: "Session expired. Please log in again."
- Automatically redirects to login page after 1.5 seconds
- Prevents confusing error messages when session expires

### 2. **Session Timeout Warning** ✅
- Shows warning dialog 3 minutes before session expires
- Displays countdown timer (MM:SS format)
- Options: "Stay Logged In" or "Log Out"

### 3. **Extended Session Duration** ✅
- JWT tokens now expire after 4 hours (up from 30 minutes)
- Backend: `ACCESS_TOKEN_EXPIRE_MINUTES = 240`

### 4. **Activity-Based Extension** ✅
- Any API call resets the inactivity timer
- Active users won't see timeout warnings
- Session only expires after 4 hours of true inactivity

### 5. **Token Refresh** ✅
- New endpoint: `POST /auth/refresh`
- "Stay Logged In" button calls refresh endpoint
- Returns new 4-hour token without re-authentication

## How to Test

### Test 1: Basic 401 Handling
1. Log in to the app
2. Open browser DevTools
3. Delete the `auth_token` from localStorage
4. Try to navigate or perform any action
5. **Expected**: Toast notification + redirect to login

### Test 2: Session Warning Dialog
1. Log in to the app
2. To simulate near-expiration:
   - Open DevTools Console
   - Run: `localStorage.setItem('auth_token', 'fake-expired-token')`
3. Wait up to 30 seconds for the check interval
4. **Expected**: Warning dialog appears

### Test 3: Activity-Based Extension
1. Log in and use the app actively
2. Continue making changes/navigating for more than 3 minutes
3. **Expected**: No warning dialog appears as long as you're active

### Test 4: Token Refresh
1. When warning dialog appears, click "Stay Logged In"
2. Check Network tab in DevTools
3. **Expected**: 
   - POST request to `/auth/refresh`
   - New token stored
   - Success toast: "Session extended successfully"

### Test 5: Logout from Warning
1. When warning dialog appears, click "Log Out"
2. **Expected**: Immediate logout and redirect to login page

## Architecture Details

### Frontend Components:
- `axiosClient.ts`: Axios instance with interceptors
- `SessionManager.tsx`: Warning dialog and timeout logic
- `activityTracker.ts`: Tracks user API activity
- `apiAxios.ts`: Updated API service using axios

### Backend Changes:
- Token expiration: 4 hours
- New endpoint: `/auth/refresh`
- Refresh updates last_login timestamp

### Key Files Modified:
- `/src/lib/axiosClient.ts` - New axios client with interceptors
- `/src/lib/apiAxios.ts` - API service using axios
- `/src/lib/activityTracker.ts` - Activity tracking utility
- `/src/components/SessionManager.tsx` - Session warning component
- `/src/contexts/AuthContext.tsx` - Added SessionManager
- `/src/app/layout.tsx` - Added Toaster for notifications
- `/backend/app/auth.py` - Extended token timeout
- `/backend/app/main.py` - Added refresh endpoint

## Troubleshooting

If session management isn't working:

1. **Check backend is running** on port 8000
2. **Verify token expiration** in `/backend/app/auth.py`
3. **Check browser console** for errors
4. **Ensure localStorage** isn't blocked
5. **Verify CORS** settings in backend

## Future Enhancements

Consider adding:
- Remember me checkbox (30-day tokens)
- Session activity log
- Multiple device management
- Logout all devices option