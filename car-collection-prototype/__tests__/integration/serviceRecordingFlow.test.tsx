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
  mockServiceIntervals,
  mockServiceHistory,
  waitForLoadingToFinish
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

describe('Service Recording Flow Integration', () => {
  beforeEach(() => {
    setupIntegrationTest();
  });

  afterEach(() => {
    cleanupIntegrationTest();
  });

  it('should complete full service recording flow from Service Schedule tab', async () => {
    // Render the car detail page with Promise params (Next.js 15 pattern)
    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Navigate to Service Schedule tab
    const serviceScheduleTab = screen.getByRole('tab', { name: /Service Schedule/i });
    fireEvent.click(serviceScheduleTab);

    // Wait for service intervals to load
    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument();
      expect(screen.getByText('Tire Rotation')).toBeInTheDocument();
    });

    // Find and click "Mark Done" button for Oil Change
    const oilChangeSection = screen.getByText('Oil Change').closest('div');
    const markDoneButton = within(oilChangeSection!).getByRole('button', { name: /Mark Done/i });
    fireEvent.click(markDoneButton);

    // Service Entry Dialog should open with Oil Change pre-selected
    await waitFor(() => {
      expect(screen.getByText('Add Service Record')).toBeInTheDocument();
    });

    // Verify Oil Change is pre-selected
    const oilChangeCheckbox = screen.getByRole('checkbox', { name: /Oil Change/i });
    expect(oilChangeCheckbox).toBeChecked();

    // Also select Tire Rotation
    const tireRotationCheckbox = screen.getByRole('checkbox', { name: /Tire Rotation/i });
    fireEvent.click(tireRotationCheckbox);

    // Fill in the service details
    fireEvent.change(screen.getByLabelText(/Mileage/i), { target: { value: '50000' } });
    fireEvent.change(screen.getByLabelText(/Shop\/Provider/i), { target: { value: 'Joe\'s Garage' } });
    fireEvent.change(screen.getByLabelText(/Invoice #/i), { target: { value: 'INV-2024-001' } });
    
    // Fill in individual costs for services
    const costInputs = screen.getAllByPlaceholderText('0.00');
    const oilChangeCostInput = costInputs[costInputs.length - 2];
    const tireRotationCostInput = costInputs[costInputs.length - 1];
    
    fireEvent.change(oilChangeCostInput, { target: { value: '45' } });
    fireEvent.change(tireRotationCostInput, { target: { value: '30' } });

    // Fill in total cost and breakdown
    fireEvent.change(screen.getByLabelText(/Total Cost/i), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Parts'), { target: { value: '50' } });
    fireEvent.change(screen.getByLabelText('Labor'), { target: { value: '40' } });
    fireEvent.change(screen.getByLabelText('Tax'), { target: { value: '10' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Add Service/i });
    fireEvent.click(submitButton);

    // Verify API calls were made correctly
    await waitFor(() => {
      // Should create a summary line item first (total cost with no individual costs assigned to intervals)
      expect(apiService.createServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        car_id: 1,
        service_item: expect.any(String),
        performed_date: expect.any(String),
        mileage: 50000,
        cost: 100,
        parts_cost: 50,
        labor_cost: 40,
        tax: 10,
        shop: 'Joe\'s Garage',
        invoice_number: 'INV-2024-001',
      }));

      // Should create individual service entries
      expect(apiService.createServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        service_item: 'Oil Change',
        cost: 45,
        mileage: 50000,
      }));

      expect(apiService.createServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        service_item: 'Tire Rotation',
        cost: 30,
        mileage: 50000,
      }));
    });

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Add Service Record')).not.toBeInTheDocument();
    });

    // Navigate to Service History tab to verify
    const serviceHistoryTab = screen.getByRole('tab', { name: /Service History/i });
    fireEvent.click(serviceHistoryTab);

    // Should refresh service history
    await waitFor(() => {
      expect(apiService.getServiceHistory).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  it('should handle service recording with summary line item when no individual costs', async () => {
    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Navigate to Service History tab directly
    const serviceHistoryTab = screen.getByRole('tab', { name: /Service History/i });
    fireEvent.click(serviceHistoryTab);

    // Click Add Service button
    await waitFor(() => {
      const addServiceButton = screen.getByRole('button', { name: /Add Service/i });
      fireEvent.click(addServiceButton);
    });

    // Fill form with total cost but no individual service selections
    fireEvent.change(screen.getByLabelText(/Service Description/i), { target: { value: 'Multi-Service Work' } });
    fireEvent.change(screen.getByLabelText(/Total Cost/i), { target: { value: '250' } });
    fireEvent.change(screen.getByLabelText(/Mileage/i), { target: { value: '51000' } });

    // Select service intervals but don't assign individual costs
    const oilChangeCheckbox = screen.getByRole('checkbox', { name: /Oil Change/i });
    const tireRotationCheckbox = screen.getByRole('checkbox', { name: /Tire Rotation/i });
    
    fireEvent.click(oilChangeCheckbox);
    fireEvent.click(tireRotationCheckbox);

    // Leave individual cost fields empty (or 0)
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /Add Service/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      // Should create summary line item with full cost
      expect(apiService.createServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        service_item: 'Multi-Service Work',
        cost: 250,
      }));

      // Should create service entries with $0 cost
      expect(apiService.createServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        service_item: 'Oil Change',
        cost: 0,
      }));

      expect(apiService.createServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        service_item: 'Tire Rotation',
        cost: 0,
      }));
    });
  });

  it('should handle editing existing service records', async () => {
    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Navigate to Service History tab
    const serviceHistoryTab = screen.getByRole('tab', { name: /Service History/i });
    fireEvent.click(serviceHistoryTab);

    // Wait for history to load
    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument();
    });

    // Click edit button on first service
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    // Dialog should open with existing data
    await waitFor(() => {
      expect(screen.getByText('Edit Service Record')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Oil Change')).toBeInTheDocument();
      expect(screen.getByDisplayValue('45000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('45')).toBeInTheDocument();
    });

    // Update some fields
    fireEvent.change(screen.getByLabelText(/Mileage/i), { target: { value: '51000' } });
    fireEvent.change(screen.getByLabelText(/Total Cost/i), { target: { value: '55' } });
    fireEvent.change(screen.getByLabelText('Parts'), { target: { value: '30' } });
    fireEvent.change(screen.getByLabelText('Labor'), { target: { value: '25' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /Update Service/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiService.updateServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        mileage: 51000,
        cost: 55,
        parts_cost: 30,
        labor_cost: 25,
      }));
    });
  });

  it('should handle deleting service records', async () => {
    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Navigate to Service History tab
    const serviceHistoryTab = screen.getByRole('tab', { name: /Service History/i });
    fireEvent.click(serviceHistoryTab);

    // Wait for history to load
    await waitFor(() => {
      expect(screen.getByText('Oil Change')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to delete this service record/i)).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /Delete/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(apiService.deleteServiceHistory).toHaveBeenCalledWith(1);
      // Should refresh service history
      expect(apiService.getServiceHistory).toHaveBeenCalledTimes(2);
    });
  });

  it('should update progress bars after service is recorded', async () => {
    // Mock service history to show no recent oil change
    (apiService.getServiceHistory as jest.Mock).mockResolvedValueOnce([]);
    
    renderWithProviders(<CarDetailPage params={Promise.resolve({ id: '1' })} />);

    await waitFor(() => {
      expect(screen.getByText('2020 Toyota Camry')).toBeInTheDocument();
    });

    // Navigate to Service Schedule
    const serviceScheduleTab = screen.getByRole('tab', { name: /Service Schedule/i });
    fireEvent.click(serviceScheduleTab);

    // Should show overdue status initially
    await waitFor(() => {
      const oilChangeSection = screen.getByText('Oil Change').closest('div');
      expect(within(oilChangeSection!).getByText(/Overdue/i)).toBeInTheDocument();
    });

    // Record a service
    const markDoneButton = screen.getAllByRole('button', { name: /Mark Done/i })[0];
    fireEvent.click(markDoneButton);

    await waitFor(() => {
      expect(screen.getByText('Add Service Record')).toBeInTheDocument();
    });

    // Fill minimal required fields
    fireEvent.change(screen.getByLabelText(/Mileage/i), { target: { value: '50000' } });
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /Add Service/i });
    fireEvent.click(submitButton);

    // Mock updated service history after recording
    (apiService.getServiceHistory as jest.Mock).mockResolvedValueOnce([
      {
        ...mockServiceHistory[0],
        performed_date: new Date().toISOString(),
        mileage: 50000,
      }
    ]);

    // Wait for dialog to close and progress to update
    await waitFor(() => {
      expect(screen.queryByText('Add Service Record')).not.toBeInTheDocument();
    });

    // Progress should now show as "Good" or "Done today"
    await waitFor(() => {
      const oilChangeSection = screen.getByText('Oil Change').closest('div');
      expect(within(oilChangeSection!).getByText(/Done today|Good/i)).toBeInTheDocument();
    });
  });
});