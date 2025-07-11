/**
 * Integration test for admin routing configuration.
 * This test simulates the nginx routing behavior to catch configuration issues.
 */

import { NextRequest } from 'next/server';

// Mock nginx routing rules based on our configuration
class NginxRoutingSimulator {
  private backendRoutes = [
    /^\/auth\//,
    /^\/admin\/(users|invitations)\//,
    /^\/cars\//,
    /^\/todos\//,
    /^\/api\//,
    /^\/data\//,
    /^\/invitations\//,
  ];

  /**
   * Simulates nginx routing decision
   * @returns 'backend' if routed to FastAPI, 'frontend' if routed to Next.js
   */
  routeRequest(path: string): 'backend' | 'frontend' {
    // Check if path matches any backend route pattern
    for (const pattern of this.backendRoutes) {
      if (pattern.test(path)) {
        return 'backend';
      }
    }
    
    // Special case for /cars redirect
    if (path === '/cars') {
      // Nginx redirects to /cars/
      return this.routeRequest('/cars/');
    }
    
    // Everything else goes to frontend
    return 'frontend';
  }
}

describe('Admin Routing Integration Tests', () => {
  let router: NginxRoutingSimulator;

  beforeEach(() => {
    router = new NginxRoutingSimulator();
  });

  describe('Admin Page Routing', () => {
    it('should route /admin to frontend (Next.js)', () => {
      expect(router.routeRequest('/admin')).toBe('frontend');
    });

    it('should route /admin/ to frontend (Next.js)', () => {
      expect(router.routeRequest('/admin/')).toBe('frontend');
    });

    it('should route /admin/anything to frontend for non-API paths', () => {
      expect(router.routeRequest('/admin/settings')).toBe('frontend');
      expect(router.routeRequest('/admin/dashboard')).toBe('frontend');
      expect(router.routeRequest('/admin/reports')).toBe('frontend');
    });
  });

  describe('Admin API Routing', () => {
    it('should route /admin/users/ to backend (FastAPI)', () => {
      expect(router.routeRequest('/admin/users/')).toBe('backend');
    });

    it('should route /admin/users/123 to backend', () => {
      expect(router.routeRequest('/admin/users/123')).toBe('backend');
    });

    it('should route /admin/invitations/ to backend', () => {
      expect(router.routeRequest('/admin/invitations/')).toBe('backend');
    });

    it('should route /admin/invitations/create to backend', () => {
      expect(router.routeRequest('/admin/invitations/create')).toBe('backend');
    });
  });

  describe('Other Routes', () => {
    it('should route auth endpoints to backend', () => {
      expect(router.routeRequest('/auth/login')).toBe('backend');
      expect(router.routeRequest('/auth/logout')).toBe('backend');
      expect(router.routeRequest('/auth/me')).toBe('backend');
    });

    it('should route cars endpoints to backend', () => {
      expect(router.routeRequest('/cars/')).toBe('backend');
      expect(router.routeRequest('/cars/1')).toBe('backend');
      expect(router.routeRequest('/cars/1/todos')).toBe('backend');
    });

    it('should route frontend pages correctly', () => {
      expect(router.routeRequest('/')).toBe('frontend');
      expect(router.routeRequest('/dashboard')).toBe('frontend');
      expect(router.routeRequest('/login')).toBe('frontend');
      expect(router.routeRequest('/cars')).toBe('backend'); // Special case - redirects to /cars/
    });
  });

  describe('Edge Cases', () => {
    it('should handle paths without trailing slashes consistently', () => {
      // Admin API endpoints require trailing slash to match
      expect(router.routeRequest('/admin/users')).toBe('frontend');
      expect(router.routeRequest('/admin/invitations')).toBe('frontend');
      
      // These should go to backend
      expect(router.routeRequest('/admin/users/')).toBe('backend');
      expect(router.routeRequest('/admin/invitations/')).toBe('backend');
    });

    it('should not route /admin/userservice to backend', () => {
      // This shouldn't match the pattern
      expect(router.routeRequest('/admin/userservice')).toBe('frontend');
    });

    it('should handle nested admin API paths', () => {
      expect(router.routeRequest('/admin/users/1/disable')).toBe('backend');
      expect(router.routeRequest('/admin/invitations/abc123/revoke')).toBe('backend');
    });
  });
});

describe('Frontend Admin Page Expectations', () => {
  let router: NginxRoutingSimulator;

  beforeEach(() => {
    router = new NginxRoutingSimulator();
  });

  it('should expect these routes to return HTML pages', () => {
    const frontendRoutes = [
      '/admin',
      '/admin/',
      '/admin/settings',
      '/admin/logs',
    ];

    frontendRoutes.forEach(route => {
      // In a real test, we'd make an HTTP request and check Content-Type
      // For now, we just document the expectation
      expect(router.routeRequest(route)).toBe('frontend');
    });
  });
});

describe('Backend Admin API Expectations', () => {
  let router: NginxRoutingSimulator;

  beforeEach(() => {
    router = new NginxRoutingSimulator();
  });

  it('should expect these routes to return JSON', () => {
    const apiRoutes = [
      '/admin/users/',
      '/admin/users/1',
      '/admin/invitations/',
      '/admin/invitations/create',
    ];

    apiRoutes.forEach(route => {
      // In a real test, we'd make an HTTP request and check Content-Type
      // For now, we just document the expectation
      expect(router.routeRequest(route)).toBe('backend');
    });
  });

  it('should expect 404 from backend for non-API admin routes', () => {
    // The backend should return 404 for routes it doesn't handle
    // This test documents that /admin and /admin/ should NOT be in the backend
    const nonApiRoutes = ['/admin', '/admin/'];
    
    // These routes should go to frontend, not backend
    nonApiRoutes.forEach(route => {
      expect(router.routeRequest(route)).toBe('frontend');
    });
  });
});