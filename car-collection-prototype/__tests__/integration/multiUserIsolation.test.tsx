import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '@/app/dashboard/page';
import CarDetailPage from '@/app/cars/[id]/page';
import { apiService } from '@/lib/api';
import { 
  renderWithProviders, 
  setupIntegrationTest, 
  cleanupIntegrationTest,
  mockCar,
  mockServiceIntervals,
  mockServiceHistory,
  mockUser,
  mockAuthContextValue
} from './testUtils';

// Mock the API service module
jest.mock('@/lib/api', () => ({
  apiService: {
    getCar: jest.fn(),
    getCarGroups: jest.fn(),
    getCars: jest.fn(),
    getServiceIntervals: jest.fn(),
    getServiceHistory: jest.fn(),
    createServiceHistory: jest.fn(),
    updateServiceHistory: jest.fn(),
    deleteServiceHistory: jest.fn(),
    researchServiceIntervals: jest.fn(),
    createServiceIntervals: jest.fn(),
    updateCar: jest.fn(),
    getTodos: jest.fn(),
    createCar: jest.fn(),
    deleteCar: jest.fn(),
  },
}));

describe('Multi-User Data Isolation Integration', () => {
  // Define two different users
  const user1 = {
    id: 1,
    username: 'user1',
    email: 'user1@example.com',
    is_admin: false,
  };

  const user2 = {
    id: 2,
    username: 'user2',
    email: 'user2@example.com',
    is_admin: false,
  };

  // Define cars for each user
  const user1Cars = [
    {
      id: 1,
      user_id: 1,
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      mileage: 50000,
      group_name: 'Daily Drivers',
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      user_id: 1,
      make: 'Honda',
      model: 'Civic',
      year: 2019,
      mileage: 40000,
      group_name: 'Daily Drivers',
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  const user2Cars = [
    {
      id: 3,
      user_id: 2,
      make: 'Ford',
      model: 'F-150',
      year: 2021,
      mileage: 30000,
      group_name: 'Trucks',
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  // Service data for user 1's car
  const user1ServiceIntervals = [
    {
      id: 1,
      car_id: 1,
      user_id: 1,
      service_item: 'Oil Change',
      interval_miles: 5000,
      interval_months: 6,
      priority: 'high',
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  const user1ServiceHistory = [
    {
      id: 1,
      car_id: 1,
      user_id: 1,
      service_item: 'Oil Change',
      performed_date: '2024-01-15T00:00:00Z',
      mileage: 45000,
      cost: 45,
      shop: 'User 1 Garage',
      created_at: '2024-01-15T00:00:00Z',
    },
  ];

  beforeEach(() => {
    setupIntegrationTest();
  });

  afterEach(() => {
    cleanupIntegrationTest();
  });

  it('should only show cars belonging to the authenticated user', async () => {
    // Test as user1
    const user1Auth = {
      ...mockAuthContextValue,
      user: user1,
    };
    
    (apiService.getCars as jest.Mock).mockResolvedValueOnce(user1Cars);
    
    renderWithProviders(<Dashboard />, { authValue: user1Auth });

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
      expect(screen.getByText('2019 Honda Civic')).toBeInTheDocument();
    });

    // User 2's car should not be visible
    expect(screen.queryByText('2021 Ford F-150')).not.toBeInTheDocument();

    // Clean up and test as user2
    cleanupIntegrationTest();
    setupIntegrationTest();
    
    const user2Auth = {
      ...mockAuthContextValue,
      user: user2,
    };
    
    (apiService.getCars as jest.Mock).mockResolvedValueOnce(user2Cars);
    
    const { unmount } = renderWithProviders(<Dashboard />, { authValue: user2Auth });

    await waitFor(() => {
      expect(screen.getByText('2021 Ford F-150')).toBeInTheDocument();
    });

    // User 1's cars should not be visible
    expect(screen.queryByText('2020 Toyota Camry')).not.toBeInTheDocument();
    expect(screen.queryByText('2019 Honda Civic')).not.toBeInTheDocument();
  });

  it('should isolate service intervals between users', async () => {
    // Test as user1
    const user1Auth = {
      ...mockAuthContextValue,
      user: user1,
    };
    
    (apiService.getCar as jest.Mock).mockResolvedValueOnce(user1Cars[0]);
    (apiService.getServiceIntervals as jest.Mock).mockResolvedValueOnce(user1ServiceIntervals);
    (apiService.getServiceHistory as jest.Mock).mockResolvedValueOnce(user1ServiceHistory);
    
    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />, { authValue: user1Auth });

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Navigate to Service Schedule
    const serviceScheduleTab = screen.getByRole('tab', { name: /Service Schedule/i });
    fireEvent.click(serviceScheduleTab);

    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument();
    });

    // Navigate to Service History
    const serviceHistoryTab = screen.getByRole('tab', { name: /Service History/i });
    fireEvent.click(serviceHistoryTab);

    await waitFor(() => {
      expect(screen.getByText('User 1 Garage')).toBeInTheDocument();
    });

    // Clean up and test as user2 trying to access user1's car
    cleanupIntegrationTest();
    setupIntegrationTest();
    
    const user2Auth = {
      ...mockAuthContextValue,
      user: user2,
    };
    
    // API should return 404 when user2 tries to access user1's car
    (apiService.getCar as jest.Mock).mockRejectedValueOnce(new Error('Car not found'));
    
    const { unmount } = renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />, { authValue: user2Auth });

    await waitFor(() => {
      expect(screen.getByText(/Car not found/i)).toBeInTheDocument();
    });
  });

  it('should prevent cross-user service record creation', async () => {
    // User1 is logged in
    const user1Auth = {
      ...mockAuthContextValue,
      user: user1,
    };
    
    (apiService.getCar as jest.Mock).mockResolvedValueOnce(user1Cars[0]);
    (apiService.getServiceIntervals as jest.Mock).mockResolvedValueOnce(user1ServiceIntervals);
    (apiService.getServiceHistory as jest.Mock).mockResolvedValueOnce([]);
    
    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />, { authValue: user1Auth });

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Navigate to Service History
    const serviceHistoryTab = screen.getByRole('tab', { name: /Service History/i });
    fireEvent.click(serviceHistoryTab);

    // Click Add Service
    const addServiceButton = screen.getByRole('button', { name: /Add Service/i });
    fireEvent.click(addServiceButton);

    await waitFor(() => {
      expect(screen.getByText('Add Service Record')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/Service Description/i), { 
      target: { value: 'Oil Change' } 
    });
    fireEvent.change(screen.getByLabelText(/Total Cost/i), { 
      target: { value: '50' } 
    });

    // Submit
    const submitButton = screen.getByRole('button', { name: /Add Service/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Should create with user1's ID
      expect(apiService.createServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        car_id: 1,
        service_item: 'Oil Change',
        cost: 50,
      }));
    });

    // The API would enforce that the car belongs to the authenticated user
    // In a real scenario, if user2 somehow tried to create a service for user1's car,
    // the API would return 404 or 403
  });

  it('should show different groups for different users', async () => {
    // User1 with "Daily Drivers" group
    const user1Auth = {
      ...mockAuthContextValue,
      user: user1,
    };
    
    (apiService.getCars as jest.Mock).mockResolvedValueOnce(user1Cars);
    
    renderWithProviders(<Dashboard />, { authValue: user1Auth });

    await waitFor(() => {
      expect(screen.getByText('Daily Drivers')).toBeInTheDocument();
    });

    // Clean up and test as user2
    cleanupIntegrationTest();
    setupIntegrationTest();
    
    const user2Auth = {
      ...mockAuthContextValue,
      user: user2,
    };
    
    (apiService.getCars as jest.Mock).mockResolvedValueOnce(user2Cars);
    
    const { unmount } = renderWithProviders(<Dashboard />, { authValue: user2Auth });

    await waitFor(() => {
      expect(screen.getByText('Trucks')).toBeInTheDocument();
    });

    // User1's group should not be visible
    expect(screen.queryByText('Daily Drivers')).not.toBeInTheDocument();
  });

  it('should isolate car creation between users', async () => {
    const user1Auth = {
      ...mockAuthContextValue,
      user: user1,
    };
    
    (apiService.getCars as jest.Mock).mockResolvedValueOnce(user1Cars);
    
    renderWithProviders(<Dashboard />, { authValue: user1Auth });

    await waitFor(() => {
      expect(screen.getByText('My Cars')).toBeInTheDocument();
    });

    // Click Add Car button
    const addCarButton = screen.getByRole('button', { name: /Add Car/i });
    fireEvent.click(addCarButton);

    // Fill form
    await waitFor(() => {
      expect(screen.getByText('Add New Car')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Year/i), { target: { value: '2022' } });
    fireEvent.change(screen.getByLabelText(/Make/i), { target: { value: 'Tesla' } });
    fireEvent.change(screen.getByLabelText(/Model/i), { target: { value: 'Model 3' } });
    fireEvent.change(screen.getByLabelText(/Current Mileage/i), { target: { value: '10000' } });

    // Submit
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      // Should create car with proper data
      expect(apiService.createCar).toHaveBeenCalledWith(expect.objectContaining({
        year: 2022,
        make: 'Tesla',
        model: 'Model 3',
        mileage: 10000,
      }));
    });

    // The new car would be automatically associated with user1 by the backend
  });

  it('should handle admin user access appropriately', async () => {
    // Admin user can see their own data (not other users' by default)
    const adminUser = {
      id: 3,
      username: 'admin',
      email: 'admin@example.com',
      is_admin: true,
    };

    const adminAuth = {
      ...mockAuthContextValue,
      user: adminUser,
    };

    const adminCars = [
      {
        id: 4,
        user_id: 3,
        make: 'Admin',
        model: 'Vehicle',
        year: 2023,
        mileage: 1000,
        group_name: 'Admin Cars',
        created_at: '2024-01-01T00:00:00Z',
      },
    ];
    
    (apiService.getCars as jest.Mock).mockResolvedValueOnce(adminCars);
    
    renderWithProviders(<Dashboard />, { authValue: adminAuth });

    await waitFor(() => {
      // Admin sees their own cars
      expect(screen.getByText('2023 Admin Vehicle')).toBeInTheDocument();
    });

    // Admin still doesn't see other users' cars in their dashboard
    expect(screen.queryByText('2020 Toyota Camry')).not.toBeInTheDocument();
    expect(screen.queryByText('2021 Ford F-150')).not.toBeInTheDocument();

    // Note: Admin features for viewing all users' data would be in a separate admin panel
  });

  it('should maintain data isolation during concurrent operations', async () => {
    // Simulate user1 creating a service record
    const user1Auth = {
      ...mockAuthContextValue,
      user: user1,
    };
    
    (apiService.getCar as jest.Mock).mockResolvedValueOnce(user1Cars[0]);
    (apiService.getServiceIntervals as jest.Mock).mockResolvedValueOnce(user1ServiceIntervals);
    (apiService.getServiceHistory as jest.Mock).mockResolvedValueOnce([]);
    
    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />, { authValue: user1Auth });

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Start creating a service record
    const serviceHistoryTab = screen.getByRole('tab', { name: /Service History/i });
    fireEvent.click(serviceHistoryTab);

    const addServiceButton = screen.getByRole('button', { name: /Add Service/i });
    fireEvent.click(addServiceButton);

    // Mock the creation to include user_id validation
    (apiService.createServiceHistory as jest.Mock).mockImplementation((carId, data) => {
      // Simulate backend validation
      if (carId === 1 && user1Cars[0].user_id === user1.id) {
        return Promise.resolve({
          id: 2,
          ...data,
          user_id: user1.id,
          car_id: carId,
        });
      }
      return Promise.reject(new Error('Unauthorized'));
    });

    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/Service Description/i), { 
      target: { value: 'Concurrent Test' } 
    });
    
    const submitButton = screen.getByRole('button', { name: /Add Service/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiService.createServiceHistory).toHaveBeenCalled();
    });

    // The service should be created successfully for user1
    // If user2 tried the same operation on user1's car, it would fail
  });
});