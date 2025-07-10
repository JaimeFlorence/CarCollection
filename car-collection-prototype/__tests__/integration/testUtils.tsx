// Mock the auth module before any imports
jest.mock('@/contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: jest.fn(() => ({
    user: { id: 1, username: 'testuser', email: 'test@example.com', is_admin: false },
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    refreshUser: jest.fn(),
    loading: false,
  })),
  AuthProvider: ({ children }: any) => children,
}));

import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { apiService } from '@/lib/api';

// Mock user for testing
export const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_admin: false,
};

export const mockAuthToken = 'test-jwt-token';

// Mock auth context value
export const mockAuthContextValue = {
  user: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  refreshUser: jest.fn(),
  loading: false,
};


// Custom render function
export function renderWithProviders(
  ui: React.ReactElement,
  {
    authValue = mockAuthContextValue,
    ...renderOptions
  } = {}
) {
  // Set up the mock to return the auth value
  const { useAuth } = require('@/contexts/AuthContext');
  useAuth.mockReturnValue(authValue);

  // Wrapper function
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock API responses
export const mockCar = {
  id: 1,
  user_id: 1,
  make: 'Toyota',
  model: 'Camry',
  year: 2020,
  mileage: 50000,
  vin: '1HGCM82633A123456',
  license_plate: 'ABC123',
  group_name: 'Daily Drivers',
  created_at: '2024-01-01T00:00:00Z',
};

export const mockServiceIntervals = [
  {
    id: 1,
    car_id: 1,
    user_id: 1,
    service_item: 'Oil Change',
    interval_miles: 5000,
    interval_months: 6,
    priority: 'high',
    cost_estimate_low: 30,
    cost_estimate_high: 50,
    source: 'manufacturer',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    car_id: 1,
    user_id: 1,
    service_item: 'Tire Rotation',
    interval_miles: 7500,
    interval_months: 12,
    priority: 'medium',
    cost_estimate_low: 20,
    cost_estimate_high: 40,
    source: 'manufacturer',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    car_id: 1,
    user_id: 1,
    service_item: 'Brake Inspection',
    interval_miles: 20000,
    interval_months: 24,
    priority: 'high',
    cost_estimate_low: 50,
    cost_estimate_high: 100,
    source: 'manufacturer',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
];

export const mockServiceHistory = [
  {
    id: 1,
    car_id: 1,
    user_id: 1,
    service_item: 'Oil Change',
    performed_date: '2024-01-15T00:00:00Z',
    mileage: 45000,
    cost: 45,
    parts_cost: 25,
    labor_cost: 20,
    shop: 'Quick Lube',
    invoice_number: 'INV-001',
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 2,
    car_id: 1,
    user_id: 1,
    service_item: 'Tire Rotation',
    performed_date: '2024-01-15T00:00:00Z',
    mileage: 45000,
    cost: 30,
    labor_cost: 30,
    shop: 'Quick Lube',
    invoice_number: 'INV-001',
    created_at: '2024-01-15T00:00:00Z',
  },
];

// Setup default mocks
export function setupDefaultMocks() {
  // Mock next/navigation
  jest.mock('next/navigation', () => ({
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }),
    usePathname: () => '/cars/1',
    useParams: () => ({ id: '1' }),
  }));

  // Set up API service mocks with default responses
  (apiService.getCar as jest.Mock).mockResolvedValue(mockCar);
  (apiService.getCarGroups as jest.Mock).mockResolvedValue(['Daily Drivers', 'Weekend Cars']);
  (apiService.getServiceIntervals as jest.Mock).mockResolvedValue(mockServiceIntervals);
  (apiService.getServiceHistory as jest.Mock).mockResolvedValue(mockServiceHistory);
  (apiService.createServiceHistory as jest.Mock).mockResolvedValue({ id: 3, ...mockServiceHistory[0] });
  (apiService.updateServiceHistory as jest.Mock).mockResolvedValue({ ...mockServiceHistory[0] });
  (apiService.deleteServiceHistory as jest.Mock).mockResolvedValue(undefined);
  (apiService.researchServiceIntervals as jest.Mock).mockResolvedValue({
    car_id: 1,
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
    suggested_intervals: mockServiceIntervals.map(interval => ({
      ...interval,
      confidence_score: 9,
      source: 'manufacturer',
    })),
    sources_checked: ['manufacturer', 'edmunds', 'carfax'],
    total_intervals_found: 3,
    research_date: new Date().toISOString(),
  });
  (apiService.createServiceIntervals as jest.Mock).mockResolvedValue(mockServiceIntervals);
  (apiService.updateCar as jest.Mock).mockResolvedValue(mockCar);
  (apiService.getCars as jest.Mock).mockResolvedValue([mockCar]);
  (apiService.getTodos as jest.Mock).mockResolvedValue([]);
}

// Utility to wait for loading states to resolve
export async function waitForLoadingToFinish(screen: any) {
  const loadingElements = screen.queryAllByText(/loading/i);
  if (loadingElements.length > 0) {
    await screen.findByText((content: string, element: any) => {
      return !content.toLowerCase().includes('loading');
    });
  }
}

// Mock localStorage
export const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Setup and teardown helpers
export function setupIntegrationTest() {
  setupDefaultMocks();
  
  // Properly mock localStorage
  global.localStorage = localStorageMock as any;
  localStorageMock.getItem.mockReturnValue(mockAuthToken);
  
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
  
  // Mock React.use for Next.js 15 async params
  const React = require('react');
  React.use = jest.fn((promise: any) => {
    if (promise && typeof promise.then === 'function') {
      // For our tests, we'll immediately resolve the promise
      let result: any;
      promise.then((r: any) => { result = r; });
      return result || { id: '1' }; // Default fallback
    }
    return promise;
  });
}

export function cleanupIntegrationTest() {
  jest.clearAllMocks();
  localStorageMock.clear();
}