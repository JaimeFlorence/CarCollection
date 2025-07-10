'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { tokenManager } from '@/lib/axiosClient';
import { activityTracker } from '@/lib/activityTracker';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Token expiration time in milliseconds (4 hours)
const TOKEN_EXPIRATION_TIME = 4 * 60 * 60 * 1000;
// Warning time before expiration (3 minutes)
const WARNING_TIME = 3 * 60 * 1000;
// Check interval (every 30 seconds)
const CHECK_INTERVAL = 30 * 1000;

export function SessionManager() {
  const { user, logout, refreshUser } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get token issue time from JWT payload
  const getTokenIssueTime = (): number | null => {
    const token = tokenManager.getToken();
    if (!token) return null;

    try {
      // JWT structure: header.payload.signature
      const payload = JSON.parse(atob(token.split('.')[1]));
      // JWT exp is in seconds, convert to milliseconds
      const expirationTime = payload.exp * 1000;
      // Calculate issue time (4 hours before expiration)
      return expirationTime - TOKEN_EXPIRATION_TIME;
    } catch (error) {
      console.error('Error parsing JWT token:', error);
      return null;
    }
  };

  const checkSessionTimeout = () => {
    const issueTime = getTokenIssueTime();
    if (!issueTime || !user) return;

    const now = Date.now();
    const lastActivity = activityTracker.getLastActivityTime();
    
    // Use the more recent time between token issue and last activity
    // This ensures active users don't get logged out
    const sessionStartTime = Math.max(issueTime, lastActivity - TOKEN_EXPIRATION_TIME);
    
    const elapsed = now - sessionStartTime;
    const remaining = TOKEN_EXPIRATION_TIME - elapsed;

    // Session already expired
    if (remaining <= 0) {
      cleanup();
      logout();
      return;
    }

    // Show warning if within warning time
    if (remaining <= WARNING_TIME && !showWarning) {
      setTimeRemaining(remaining);
      setShowWarning(true);
      
      // Update time remaining every second
      if (warningTimeoutRef.current) {
        clearInterval(warningTimeoutRef.current);
      }
      
      warningTimeoutRef.current = setInterval(() => {
        const newRemaining = TOKEN_EXPIRATION_TIME - (Date.now() - sessionStartTime);
        if (newRemaining <= 0) {
          cleanup();
          logout();
        } else {
          setTimeRemaining(newRemaining);
        }
      }, 1000);
    } else if (remaining > WARNING_TIME && showWarning) {
      // Hide warning if activity extended the session
      setShowWarning(false);
      if (warningTimeoutRef.current) {
        clearInterval(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
    }
  };

  const cleanup = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearInterval(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    setShowWarning(false);
  };

  const handleStayLoggedIn = async () => {
    try {
      // Call the refresh token endpoint to get a new token
      const { apiService } = await import('@/lib/api');
      const response = await apiService.refreshToken();
      
      // Update user state with the refreshed user data
      await refreshUser();
      
      setShowWarning(false);
      toast.success('Session extended successfully');
      
      // Reset the warning timeout
      if (warningTimeoutRef.current) {
        clearInterval(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      
      // Reset activity tracker to current time
      activityTracker.updateActivity();
    } catch (error) {
      console.error('Failed to extend session:', error);
      toast.error('Failed to extend session. Please log in again.');
      logout();
    }
  };

  const handleLogout = () => {
    cleanup();
    logout();
  };

  // Format time remaining as MM:SS
  const formatTimeRemaining = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!user) {
      cleanup();
      return;
    }

    // Initial check
    checkSessionTimeout();

    // Set up periodic checks
    intervalRef.current = setInterval(checkSessionTimeout, CHECK_INTERVAL);

    // Listen for activity updates
    const handleActivity = () => {
      checkSessionTimeout();
    };
    
    activityTracker.addActivityListener(handleActivity);

    return () => {
      cleanup();
      activityTracker.removeActivityListener(handleActivity);
    };
  }, [user]);

  return (
    <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
          <AlertDialogDescription>
            Your session will expire in {formatTimeRemaining(timeRemaining)}. 
            Would you like to stay logged in?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleLogout}>
            Log Out
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleStayLoggedIn}>
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}