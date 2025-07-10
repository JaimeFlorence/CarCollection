import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from '@/app/dashboard/page';
import CarDetailPage from '@/app/cars/[id]/page';
import { apiService } from '@/lib/api';
import { 
  renderWithProviders, 
  setupIntegrationTest, 
  cleanupIntegrationTest,
  mockCar,
  mockAuthContextValue
} from './testUtils';

// Mock the API service module
jest.mock('@/lib/api', () => ({
  apiService: {
    getCar: jest.fn(),
    getCarGroups: jest.fn(),
    getCars: jest.fn(),
    createCar: jest.fn(),
    updateCar: jest.fn(),
    deleteCar: jest.fn(),
    getServiceIntervals: jest.fn(),
    getServiceHistory: jest.fn(),
    createServiceHistory: jest.fn(),
    updateServiceHistory: jest.fn(),
    deleteServiceHistory: jest.fn(),
    getTodos: jest.fn(),
    researchServiceIntervals: jest.fn(),
    createServiceIntervals: jest.fn(),
  },
}));

// Mock next/navigation for routing
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useParams: () => ({ id: '1' }),
}));

// Mock window methods
const mockConfirm = jest.fn();
window.confirm = mockConfirm;

describe('Car Management Flow Integration', () => {
  beforeEach(() => {
    setupIntegrationTest();
    mockConfirm.mockReturnValue(true);
    mockPush.mockClear();
    mockBack.mockClear();
  });

  afterEach(() => {
    cleanupIntegrationTest();
  });

  it('should complete full car creation flow', async () => {
    // Start with empty car list
    (apiService.getCars as jest.Mock).mockResolvedValueOnce([]);
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('My Cars')).toBeInTheDocument();
    });

    // Should show empty state
    expect(screen.getByText(/No cars in your collection yet/i)).toBeInTheDocument();

    // Click Add Car button
    const addCarButton = screen.getByRole('button', { name: /Add Car/i });
    fireEvent.click(addCarButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('Add New Car')).toBeInTheDocument();
    });

    // Fill in car details
    fireEvent.change(screen.getByLabelText(/Year/i), { target: { value: '2023' } });
    fireEvent.change(screen.getByLabelText(/Make/i), { target: { value: 'Tesla' } });
    fireEvent.change(screen.getByLabelText(/Model/i), { target: { value: 'Model Y' } });
    fireEvent.change(screen.getByLabelText(/VIN/i), { target: { value: '5YJ3E1EA8NF123456' } });
    fireEvent.change(screen.getByLabelText(/Current Mileage/i), { target: { value: '5000' } });
    fireEvent.change(screen.getByLabelText(/License Plate/i), { target: { value: 'TSLA001' } });
    
    // Select group
    const groupSelect = screen.getByLabelText(/Group/i);
    fireEvent.change(groupSelect, { target: { value: 'Electric Vehicles' } });

    // Add notes
    fireEvent.change(screen.getByLabelText(/Notes/i), { 
      target: { value: 'Long Range AWD, Pearl White' } 
    });

    // Mock the API response
    const newCar = {
      id: 1,
      user_id: 1,
      year: 2023,
      make: 'Tesla',
      model: 'Model Y',
      vin: '5YJ3E1EA8NF123456',
      mileage: 5000,
      license_plate: 'TSLA001',
      group_name: 'Electric Vehicles',
      notes: 'Long Range AWD, Pearl White',
      created_at: new Date().toISOString(),
    };

    (apiService.createCar as jest.Mock).mockResolvedValueOnce(newCar);
    (apiService.getCars as jest.Mock).mockResolvedValueOnce([newCar]);

    // Submit form
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiService.createCar).toHaveBeenCalledWith({
        year: 2023,
        make: 'Tesla',
        model: 'Model Y',
        vin: '5YJ3E1EA8NF123456',
        mileage: 5000,
        license_plate: 'TSLA001',
        group_name: 'Electric Vehicles',
        notes: 'Long Range AWD, Pearl White',
      });
    });

    // Modal should close and car should appear
    await waitFor(() => {
      expect(screen.queryByText('Add New Car')).not.toBeInTheDocument();
      expect(screen.getByText('2023 Tesla Model Y')).toBeInTheDocument();
      expect(screen.getByText('5,000 miles')).toBeInTheDocument();
    });

    // Should navigate to car detail page when clicked
    const carCard = screen.getByText('2023 Tesla Model Y').closest('div[role="button"]');
    fireEvent.click(carCard!);

    expect(mockPush).toHaveBeenCalledWith('/cars/1');
  });

  it('should handle car editing flow', async () => {
    (apiService.getCar as jest.Mock).mockResolvedValue(mockCar);
    (apiService.getServiceIntervals as jest.Mock).mockResolvedValue([]);
    (apiService.getServiceHistory as jest.Mock).mockResolvedValue([]);
    
    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Click Edit button
    const editButton = screen.getByRole('button', { name: /Edit/i });
    fireEvent.click(editButton);

    // Edit form should open with pre-filled data
    await waitFor(() => {
      expect(screen.getByText('Edit Car')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2020')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Toyota')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Camry')).toBeInTheDocument();
      expect(screen.getByDisplayValue('50000')).toBeInTheDocument();
    });

    // Update some fields
    fireEvent.change(screen.getByLabelText(/Current Mileage/i), { target: { value: '55000' } });
    fireEvent.change(screen.getByLabelText(/License Plate/i), { target: { value: 'NEW123' } });
    fireEvent.change(screen.getByLabelText(/Notes/i), { 
      target: { value: 'Recently serviced' } 
    });

    // Mock update response
    const updatedCar = {
      ...mockCar,
      mileage: 55000,
      license_plate: 'NEW123',
      notes: 'Recently serviced',
    };

    (apiService.updateCar as jest.Mock).mockResolvedValueOnce(updatedCar);
    (apiService.getCar as jest.Mock).mockResolvedValueOnce(updatedCar);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiService.updateCar).toHaveBeenCalledWith(1, {
        mileage: 55000,
        license_plate: 'NEW123',
        notes: 'Recently serviced',
      });
    });

    // Should close modal and show updated data
    await waitFor(() => {
      expect(screen.queryByText('Edit Car')).not.toBeInTheDocument();
      expect(screen.getByText('55,000 miles')).toBeInTheDocument();
      expect(screen.getByText('NEW123')).toBeInTheDocument();
    });
  });

  it('should handle car deletion flow', async () => {
    const carsBeforeDeletion = [mockCar, { ...mockCar, id: 2, model: 'Corolla' }];
    const carsAfterDeletion = [{ ...mockCar, id: 2, model: 'Corolla' }];
    
    (apiService.getCars as jest.Mock).mockResolvedValueOnce(carsBeforeDeletion);
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
      expect(screen.getByText('2020 Toyota Corolla')).toBeInTheDocument();
    });

    // Find delete button for Camry
    const camryCard = screen.getByText('2020 Toyota Camry').closest('.relative');
    const deleteButton = within(camryCard!).getByRole('button', { name: /delete/i });
    
    fireEvent.click(deleteButton);

    // Confirm dialog should appear
    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this car? This will also delete all associated service records and cannot be undone.'
    );

    // Mock successful deletion
    (apiService.deleteCar as jest.Mock).mockResolvedValueOnce(undefined);
    (apiService.getCars as jest.Mock).mockResolvedValueOnce(carsAfterDeletion);

    await waitFor(() => {
      expect(apiService.deleteCar).toHaveBeenCalledWith(1);
    });

    // Camry should be gone, Corolla should remain
    await waitFor(() => {
      expect(screen.queryByText('2020 Toyota Camry')).not.toBeInTheDocument();
      expect(screen.getByText('2020 Toyota Corolla')).toBeInTheDocument();
    });
  });

  it('should handle group management', async () => {
    (apiService.getCar as jest.Mock).mockResolvedValue(mockCar);
    (apiService.getServiceIntervals as jest.Mock).mockResolvedValue([]);
    (apiService.getServiceHistory as jest.Mock).mockResolvedValue([]);
    
    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Check current group
    expect(screen.getByText('Daily Drivers')).toBeInTheDocument();

    // Click Change Group
    const changeGroupButton = screen.getByRole('button', { name: /Change Group/i });
    fireEvent.click(changeGroupButton);

    // Group selector should appear
    await waitFor(() => {
      const groupSelect = screen.getByRole('combobox');
      expect(groupSelect).toBeInTheDocument();
    });

    // Select "Create New Group"
    const groupSelect = screen.getByRole('combobox');
    fireEvent.change(groupSelect, { target: { value: 'new' } });

    // New group input should appear
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter new group name/i)).toBeInTheDocument();
    });

    // Enter new group name
    fireEvent.change(screen.getByPlaceholderText(/Enter new group name/i), {
      target: { value: 'Family Cars' }
    });

    // Mock update with new group
    const updatedCar = { ...mockCar, group_name: 'Family Cars' };
    (apiService.updateCar as jest.Mock).mockResolvedValueOnce(updatedCar);
    (apiService.getCar as jest.Mock).mockResolvedValueOnce(updatedCar);

    // Add new group
    const addButton = screen.getByRole('button', { name: /Add/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(apiService.updateCar).toHaveBeenCalledWith(1, {
        group_name: 'Family Cars'
      });
    });

    // Should show new group
    await waitFor(() => {
      expect(screen.getByText('Family Cars')).toBeInTheDocument();
    });
  });

  it('should validate required fields during car creation', async () => {
    (apiService.getCars as jest.Mock).mockResolvedValueOnce([]);
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('My Cars')).toBeInTheDocument();
    });

    // Open add car modal
    const addCarButton = screen.getByRole('button', { name: /Add Car/i });
    fireEvent.click(addCarButton);

    await waitFor(() => {
      expect(screen.getByText('Add New Car')).toBeInTheDocument();
    });

    // Try to save without filling required fields
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/Year is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Make is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Model is required/i)).toBeInTheDocument();
    });

    // API should not be called
    expect(apiService.createCar).not.toHaveBeenCalled();

    // Fill required fields
    fireEvent.change(screen.getByLabelText(/Year/i), { target: { value: '2022' } });
    fireEvent.change(screen.getByLabelText(/Make/i), { target: { value: 'Honda' } });
    fireEvent.change(screen.getByLabelText(/Model/i), { target: { value: 'Accord' } });

    // Mock successful creation
    (apiService.createCar as jest.Mock).mockResolvedValueOnce({
      id: 1,
      user_id: 1,
      year: 2022,
      make: 'Honda',
      model: 'Accord',
      created_at: new Date().toISOString(),
    });

    // Try again
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiService.createCar).toHaveBeenCalled();
    });
  });

  it('should handle year range validation', async () => {
    (apiService.getCars as jest.Mock).mockResolvedValueOnce([]);
    
    renderWithProviders(<Dashboard />);

    const addCarButton = screen.getByRole('button', { name: /Add Car/i });
    fireEvent.click(addCarButton);

    await waitFor(() => {
      expect(screen.getByText('Add New Car')).toBeInTheDocument();
    });

    const yearInput = screen.getByLabelText(/Year/i);

    // Test invalid years
    fireEvent.change(yearInput, { target: { value: '1899' } }); // Too old
    fireEvent.blur(yearInput);

    await waitFor(() => {
      expect(screen.getByText(/Year must be between 1900 and/i)).toBeInTheDocument();
    });

    // Test future year
    const futureYear = new Date().getFullYear() + 2;
    fireEvent.change(yearInput, { target: { value: futureYear.toString() } });
    fireEvent.blur(yearInput);

    await waitFor(() => {
      expect(screen.getByText(/Year must be between 1900 and/i)).toBeInTheDocument();
    });

    // Test valid year
    fireEvent.change(yearInput, { target: { value: '2020' } });
    fireEvent.blur(yearInput);

    await waitFor(() => {
      expect(screen.queryByText(/Year must be between 1900 and/i)).not.toBeInTheDocument();
    });
  });

  it('should display car statistics correctly', async () => {
    const multipleCarList = [
      { ...mockCar, id: 1, mileage: 50000 },
      { ...mockCar, id: 2, model: 'Corolla', mileage: 30000 },
      { ...mockCar, id: 3, make: 'Honda', model: 'Civic', mileage: 40000 },
    ];

    (apiService.getCars as jest.Mock).mockResolvedValueOnce(multipleCarList);
    
    renderWithProviders(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('My Cars')).toBeInTheDocument();
    });

    // Should show correct statistics
    expect(screen.getByText('3')).toBeInTheDocument(); // Total cars
    expect(screen.getByText('120,000')).toBeInTheDocument(); // Total mileage
    expect(screen.getByText('40,000')).toBeInTheDocument(); // Average mileage

    // Should show all cars
    expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    expect(screen.getByText('2020 Toyota Corolla')).toBeInTheDocument();
    expect(screen.getByText('2020 Honda Civic')).toBeInTheDocument();
  });
});