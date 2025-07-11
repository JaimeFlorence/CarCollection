#!/bin/bash
# Fix Admin API URL issue on staging server

echo "Fixing Admin API URL issue on staging server..."

# Server details
SERVER_IP="93.127.194.202"
SERVER_USER="root"

# Create deployment script
cat << 'EOF' > /tmp/fix-admin-api.sh
#!/bin/bash
cd /opt/carcollection

echo "Backing up current frontend code..."
cp -r car-collection-prototype car-collection-prototype.backup-$(date +%Y%m%d-%H%M%S)

echo "Updating axiosClient.ts to use environment variable..."
cat > car-collection-prototype/src/lib/axiosClient.ts << 'AXIOSEOF'
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { toast } from 'sonner';
import { activityTracker } from './activityTracker';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
const axiosClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
export const tokenManager = {
  getToken: () => localStorage.getItem('auth_token'),
  setToken: (token: string | null) => {
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  },
  clearToken: () => localStorage.removeItem('auth_token'),
};

// Request interceptor to add auth token and track activity
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenManager.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      // Track user activity on authenticated requests
      activityTracker.updateActivity();
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
axiosClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token
      tokenManager.clearToken();
      
      // Show toast notification
      toast.error('Session expired. Please log in again.');
      
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
    
    return Promise.reject(error);
  }
);

export default axiosClient;
AXIOSEOF

echo "Creating production environment file..."
cat > car-collection-prototype/.env.production << 'ENVEOF'
# Production environment variables
NEXT_PUBLIC_API_URL=http://93.127.194.202
ENVEOF

echo "Rebuilding frontend..."
cd car-collection-prototype
npm run build

echo "Restarting frontend service..."
systemctl restart carcollection-frontend

echo "Waiting for service to start..."
sleep 5

echo "Checking service status..."
systemctl status carcollection-frontend --no-pager

echo "Fix applied successfully!"
echo "Please clear your browser cache and try accessing the admin page again."
EOF

# Make script executable
chmod +x /tmp/fix-admin-api.sh

# Copy and execute on server
echo "Copying fix script to staging server..."
scp /tmp/fix-admin-api.sh ${SERVER_USER}@${SERVER_IP}:/tmp/

echo "Executing fix on staging server..."
ssh ${SERVER_USER}@${SERVER_IP} "bash /tmp/fix-admin-api.sh"

echo "Done! The Admin API URL issue should now be fixed on staging."
echo "Please clear your browser cache and try accessing http://93.127.194.202/admin again."