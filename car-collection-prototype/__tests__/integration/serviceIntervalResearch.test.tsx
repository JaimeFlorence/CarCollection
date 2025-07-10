import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CarDetailPage from '@/app/cars/[id]/page';
import { apiService } from '@/lib/api';
import { 
  renderWithProviders, 
  setupIntegrationTest, 
  cleanupIntegrationTest,
  mockCar,
  mockServiceIntervals
} from './testUtils';

// Mock the API service module
jest.mock('@/lib/api', () => ({
  apiService: {
    getCar: jest.fn(),
    getCarGroups: jest.fn(),
    getServiceIntervals: jest.fn(),
    getServiceHistory: jest.fn(),
    createServiceHistory: jest.fn(),
    updateServiceHistory: jest.fn(),
    deleteServiceHistory: jest.fn(),
    researchServiceIntervals: jest.fn(),
    createServiceIntervals: jest.fn(),
    updateCar: jest.fn(),
    getCars: jest.fn(),
    getTodos: jest.fn(),
  },
}));

// Mock window.confirm
const mockConfirm = jest.fn();
window.confirm = mockConfirm;

// Mock window.alert
const mockAlert = jest.fn();
window.alert = mockAlert;

describe('Service Interval Research Integration', () => {
  beforeEach(() => {
    setupIntegrationTest();
    mockConfirm.mockReturnValue(true);
    mockAlert.mockClear();
    
    // Start with no service intervals
    (apiService.getServiceIntervals as jest.Mock).mockResolvedValueOnce([]);
  });

  afterEach(() => {
    cleanupIntegrationTest();
  });

  it('should complete full research flow for manufacturer-specific intervals', async () => {
    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Navigate to Service Schedule tab
    const serviceScheduleTab = screen.getByRole('tab', { name: /Service Schedule/i });
    fireEvent.click(serviceScheduleTab);

    // Should show empty state with research option
    await waitFor(() => {
      expect(screen.getByText(/No service intervals configured/i)).toBeInTheDocument();
    });

    // Click Research Intervals button
    const researchButton = screen.getByRole('button', { name: /Research Intervals/i });
    fireEvent.click(researchButton);

    // Should call research API
    await waitFor(() => {
      expect(apiService.researchServiceIntervals).toHaveBeenCalledWith(1, undefined);
    });

    // Confirm dialog should show research results
    expect(mockConfirm).toHaveBeenCalledWith(expect.stringContaining('Found 3 service intervals from 3 sources'));
    expect(mockConfirm).toHaveBeenCalledWith(expect.stringContaining('Oil Change'));
    expect(mockConfirm).toHaveBeenCalledWith(expect.stringContaining('Tire Rotation'));

    // Should create intervals
    await waitFor(() => {
      expect(apiService.createServiceIntervals).toHaveBeenCalledWith(1, expect.arrayContaining([
        expect.objectContaining({
          car_id: 1,
          service_item: 'Oil Change',
          interval_miles: 5000,
          interval_months: 6,
        }),
        expect.objectContaining({
          service_item: 'Tire Rotation',
        }),
      ]));
    });

    // Mock updated intervals list
    (apiService.getServiceIntervals as jest.Mock).mockResolvedValueOnce(mockServiceIntervals);

    // Should show success message
    expect(mockAlert).toHaveBeenCalledWith('Successfully added 3 service intervals to your schedule!');

    // Should refresh and show intervals
    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument();
      expect(screen.getByText('Tire Rotation')).toBeInTheDocument();
      expect(screen.getByText('Brake Inspection')).toBeInTheDocument();
    });
  });

  it('should handle diesel engine type selection for compatible vehicles', async () => {
    // Update mock car to be a Ford F-250
    const dieselTruck = {
      ...mockCar,
      make: 'Ford',
      model: 'F-250 Super Duty',
    };
    (apiService.getCar as jest.Mock).mockResolvedValue(dieselTruck);

    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    await waitFor(() => {
      expect(screen.getByText('2020 Ford F-250 Super Duty')).toBeInTheDocument();
    });

    // Navigate to Service Schedule
    const serviceScheduleTab = screen.getByRole('tab', { name: /Service Schedule/i });
    fireEvent.click(serviceScheduleTab);

    await waitFor(() => {
      expect(screen.getByText(/No service intervals configured/i)).toBeInTheDocument();
    });

    // Click Research Intervals
    const researchButton = screen.getByRole('button', { name: /Research Intervals/i });
    fireEvent.click(researchButton);

    // Should show engine type dialog
    await waitFor(() => {
      expect(screen.getByText(/Select Engine Type/i)).toBeInTheDocument();
      expect(screen.getByText(/This vehicle is available with different engine types/i)).toBeInTheDocument();
    });

    // Select diesel
    const dieselButton = screen.getByRole('button', { name: /Diesel/i });
    fireEvent.click(dieselButton);

    // Should call research with engine type
    await waitFor(() => {
      expect(apiService.researchServiceIntervals).toHaveBeenCalledWith(1, 'diesel');
    });

    // Mock diesel-specific intervals
    const dieselIntervals = [
      ...mockServiceIntervals,
      {
        id: 4,
        car_id: 1,
        user_id: 1,
        service_item: 'DEF Fluid',
        interval_miles: 10000,
        interval_months: 12,
        priority: 'high',
        source: 'manufacturer',
      },
      {
        id: 5,
        car_id: 1,
        user_id: 1,
        service_item: 'Fuel Filter',
        interval_miles: 20000,
        interval_months: 24,
        priority: 'high',
        source: 'manufacturer',
      },
    ];

    (apiService.researchServiceIntervals as jest.Mock).mockResolvedValueOnce({
      car_id: 1,
      make: 'Ford',
      model: 'F-250 Super Duty',
      year: 2020,
      suggested_intervals: dieselIntervals,
      sources_checked: ['manufacturer', 'diesel_specific'],
      total_intervals_found: 5,
      research_date: new Date().toISOString(),
    });

    // Should show diesel-specific results
    expect(mockConfirm).toHaveBeenCalledWith(expect.stringContaining('Found 5 service intervals'));
    expect(mockConfirm).toHaveBeenCalledWith(expect.stringContaining('DEF Fluid'));
  });

  it('should handle fallback to default intervals when research fails', async () => {
    // Mock research to return no results
    (apiService.researchServiceIntervals as jest.Mock).mockResolvedValueOnce({
      car_id: 1,
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      suggested_intervals: [],
      sources_checked: ['manufacturer'],
      total_intervals_found: 0,
      research_date: new Date().toISOString(),
    });

    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Navigate to Service Schedule
    const serviceScheduleTab = screen.getByRole('tab', { name: /Service Schedule/i });
    fireEvent.click(serviceScheduleTab);

    // Click Research Intervals
    const researchButton = screen.getByRole('button', { name: /Research Intervals/i });
    fireEvent.click(researchButton);

    await waitFor(() => {
      expect(apiService.researchServiceIntervals).toHaveBeenCalled();
    });

    // Should show fallback dialog
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining('No specific service intervals found')
    );
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining('Would you like to apply a standard maintenance schedule instead?')
    );

    // Should create default intervals
    await waitFor(() => {
      expect(apiService.createServiceIntervals).toHaveBeenCalled();
      const calls = (apiService.createServiceIntervals as jest.Mock).mock.calls;
      const intervals = calls[0][1];
      
      // Should include standard intervals
      expect(intervals).toEqual(expect.arrayContaining([
        expect.objectContaining({
          service_item: 'Oil Change',
          interval_miles: 5000,
        }),
        expect.objectContaining({
          service_item: 'Tire Rotation',
          interval_miles: 7500,
        }),
      ]));
    });
  });

  it('should handle research API errors gracefully', async () => {
    // Mock research to fail
    (apiService.researchServiceIntervals as jest.Mock).mockRejectedValueOnce(
      new Error('Research service unavailable')
    );

    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Navigate to Service Schedule
    const serviceScheduleTab = screen.getByRole('tab', { name: /Service Schedule/i });
    fireEvent.click(serviceScheduleTab);

    // Click Research Intervals
    const researchButton = screen.getByRole('button', { name: /Research Intervals/i });
    fireEvent.click(researchButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining('Failed to research service intervals')
      );
    });
  });

  it('should allow manual interval creation after research', async () => {
    // Start with some intervals from research
    (apiService.getServiceIntervals as jest.Mock).mockResolvedValueOnce(mockServiceIntervals);

    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Navigate to Service Schedule
    const serviceScheduleTab = screen.getByRole('tab', { name: /Service Schedule/i });
    fireEvent.click(serviceScheduleTab);

    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument();
    });

    // Click Add Interval button
    const addButton = screen.getByRole('button', { name: /Add Interval/i });
    fireEvent.click(addButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('Add Service Interval')).toBeInTheDocument();
    });

    // Fill in custom interval
    fireEvent.change(screen.getByLabelText(/Service Name/i), { 
      target: { value: 'Custom Inspection' } 
    });
    fireEvent.change(screen.getByLabelText(/Miles/i), { 
      target: { value: '15000' } 
    });
    fireEvent.change(screen.getByLabelText(/Months/i), { 
      target: { value: '18' } 
    });

    // Select priority
    const prioritySelect = screen.getByLabelText(/Priority/i);
    fireEvent.change(prioritySelect, { target: { value: 'medium' } });

    // Add cost estimates
    const costInputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(costInputs[0], { target: { value: '100' } }); // Low estimate
    fireEvent.change(costInputs[1], { target: { value: '200' } }); // High estimate

    // Save
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    // Should create the interval
    await waitFor(() => {
      expect(apiService.createServiceIntervals).toHaveBeenCalledWith(1, [
        expect.objectContaining({
          service_item: 'Custom Inspection',
          interval_miles: 15000,
          interval_months: 18,
          priority: 'medium',
          cost_estimate_low: 100,
          cost_estimate_high: 200,
        })
      ]);
    });
  });

  it('should show confidence scores and sources in research results', async () => {
    // Mock research with confidence scores
    const detailedIntervals = mockServiceIntervals.map(interval => ({
      ...interval,
      confidence_score: 9,
      source: 'manufacturer',
      notes: 'Recommended by Toyota',
    }));

    (apiService.researchServiceIntervals as jest.Mock).mockResolvedValueOnce({
      car_id: 1,
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      suggested_intervals: detailedIntervals,
      sources_checked: ['manufacturer', 'edmunds', 'carfax'],
      total_intervals_found: 3,
      research_date: new Date().toISOString(),
    });

    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Navigate to Service Schedule
    const serviceScheduleTab = screen.getByRole('tab', { name: /Service Schedule/i });
    fireEvent.click(serviceScheduleTab);

    // Research intervals
    const researchButton = screen.getByRole('button', { name: /Research Intervals/i });
    fireEvent.click(researchButton);

    await waitFor(() => {
      // Confirm dialog should mention sources
      expect(mockConfirm).toHaveBeenCalledWith(
        expect.stringContaining('Found 3 service intervals from 3 sources')
      );
    });

    // After creation, intervals should show with source info
    (apiService.getServiceIntervals as jest.Mock).mockResolvedValueOnce(detailedIntervals);

    await waitFor(() => {
      // Should create intervals with source data
      expect(apiService.createServiceIntervals).toHaveBeenCalledWith(1, 
        expect.arrayContaining([
          expect.objectContaining({
            source: 'manufacturer',
            notes: 'Recommended by Toyota',
          })
        ])
      );
    });
  });
});