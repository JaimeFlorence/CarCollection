import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ServiceEntryDialog from '@/components/ServiceEntryDialog';
import { ServiceHistory, ServiceInterval, apiService } from '@/lib/api';

// Mock the API service
jest.mock('@/lib/api', () => ({
  apiService: {
    getServiceIntervals: jest.fn(),
    getServiceHistory: jest.fn(),
    createServiceHistory: jest.fn(),
    updateServiceHistory: jest.fn(),
  },
}));

describe('Cost Breakdown Validation', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  
  const defaultProps = {
    carId: 1,
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (apiService.getServiceIntervals as jest.Mock).mockResolvedValue([]);
    (apiService.getServiceHistory as jest.Mock).mockResolvedValue([]);
  });

  describe('Cost breakdown field behavior', () => {
    it('should display cost breakdown fields in the dialog', () => {
      render(<ServiceEntryDialog {...defaultProps} />);

      expect(screen.getByText('Cost Breakdown (Optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Parts')).toBeInTheDocument();
      expect(screen.getByLabelText('Labor')).toBeInTheDocument();
      expect(screen.getByLabelText('Tax')).toBeInTheDocument();
    });

    it('should calculate and display breakdown total', async () => {
      render(<ServiceEntryDialog {...defaultProps} />);

      const partsInput = screen.getByLabelText('Parts');
      const laborInput = screen.getByLabelText('Labor');
      const taxInput = screen.getByLabelText('Tax');

      fireEvent.change(partsInput, { target: { value: '100.50' } });
      fireEvent.change(laborInput, { target: { value: '75.00' } });
      fireEvent.change(taxInput, { target: { value: '14.25' } });

      // Look for the breakdown total
      await waitFor(() => {
        expect(screen.getByText('Breakdown Total: $189.75')).toBeInTheDocument();
      });
    });

    it('should not display breakdown total when no values are entered', () => {
      render(<ServiceEntryDialog {...defaultProps} />);

      expect(screen.queryByText(/Breakdown Total:/)).not.toBeInTheDocument();
    });

    it('should handle partial breakdown entries', async () => {
      render(<ServiceEntryDialog {...defaultProps} />);

      const partsInput = screen.getByLabelText('Parts');
      const laborInput = screen.getByLabelText('Labor');

      fireEvent.change(partsInput, { target: { value: '100' } });
      fireEvent.change(laborInput, { target: { value: '0' } });
      // Leave tax empty

      await waitFor(() => {
        expect(screen.getByText('Breakdown Total: $100.00')).toBeInTheDocument();
      });
    });
  });

  describe('Cost validation logic', () => {
    it('should validate numeric input for cost fields', async () => {
      render(<ServiceEntryDialog {...defaultProps} />);

      const partsInput = screen.getByLabelText('Parts');
      const descriptionInput = screen.getByLabelText(/Service Description/);

      // Fill required field
      fireEvent.change(descriptionInput, { target: { value: 'Test Service' } });

      // Try to enter non-numeric value (simulating validation)
      fireEvent.change(partsInput, { target: { value: 'abc' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Add Service/i });
      fireEvent.click(submitButton);

      // Note: HTML5 number inputs prevent non-numeric entry, so we test the validation message
      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
      });
    });

    it('should allow breakdown that does not match total', async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(<ServiceEntryDialog {...defaultProps} />);

      // Fill in the form
      fireEvent.change(screen.getByLabelText(/Service Description/), { target: { value: 'Oil Change' } });
      fireEvent.change(screen.getByLabelText(/Total Cost/), { target: { value: '200' } });
      fireEvent.change(screen.getByLabelText('Parts'), { target: { value: '50' } });
      fireEvent.change(screen.getByLabelText('Labor'), { target: { value: '75' } });
      fireEvent.change(screen.getByLabelText('Tax'), { target: { value: '10' } });

      // Submit - breakdown is 135 but total is 200 (allowed per requirements)
      const submitButton = screen.getByRole('button', { name: /Add Service/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            cost: 200,
            parts_cost: 50,
            labor_cost: 75,
            tax: 10,
          }),
          [],
          []
        );
      });
    });

    it('should handle zero values in breakdown fields', async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(<ServiceEntryDialog {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Service Description/), { target: { value: 'Inspection' } });
      fireEvent.change(screen.getByLabelText(/Total Cost/), { target: { value: '50' } });
      fireEvent.change(screen.getByLabelText('Parts'), { target: { value: '0' } });
      fireEvent.change(screen.getByLabelText('Labor'), { target: { value: '50' } });
      fireEvent.change(screen.getByLabelText('Tax'), { target: { value: '0' } });

      const submitButton = screen.getByRole('button', { name: /Add Service/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            cost: 50,
            parts_cost: 0,
            labor_cost: 50,
            tax: 0,
          }),
          [],
          []
        );
      });
    });

    it('should handle empty breakdown fields as undefined', async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(<ServiceEntryDialog {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Service Description/), { target: { value: 'Quick Check' } });
      fireEvent.change(screen.getByLabelText(/Total Cost/), { target: { value: '25' } });
      // Leave all breakdown fields empty

      const submitButton = screen.getByRole('button', { name: /Add Service/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            cost: 25,
            parts_cost: undefined,
            labor_cost: undefined,
            tax: undefined,
          }),
          [],
          []
        );
      });
    });
  });

  describe('CalculatorInput integration', () => {
    it('should support calculator expressions in cost fields', async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(<ServiceEntryDialog {...defaultProps} />);

      const partsInput = screen.getByLabelText('Parts');
      const laborInput = screen.getByLabelText('Labor');
      const taxInput = screen.getByLabelText('Tax');
      const totalInput = screen.getByLabelText(/Total Cost/);

      // Enter calculator expressions
      fireEvent.change(partsInput, { target: { value: '=50+25' } });
      fireEvent.blur(partsInput);

      fireEvent.change(laborInput, { target: { value: '=100*2' } });
      fireEvent.blur(laborInput);

      fireEvent.change(taxInput, { target: { value: '=275*0.08' } });
      fireEvent.blur(taxInput);

      fireEvent.change(totalInput, { target: { value: '=75+200+22' } });
      fireEvent.blur(totalInput);

      // Fill required field
      fireEvent.change(screen.getByLabelText(/Service Description/), { target: { value: 'Major Service' } });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Add Service/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            service_item: 'Major Service',
            cost: 297,      // 75+200+22
            parts_cost: 75,  // 50+25
            labor_cost: 200, // 100*2
            tax: 22,         // 275*0.08
          }),
          [],
          []
        );
      });
    });
  });

  describe('Cost breakdown with service intervals', () => {
    const mockIntervals: ServiceInterval[] = [
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
        created_at: '2024-01-01T00:00:00Z',
      },
    ];

    beforeEach(() => {
      (apiService.getServiceIntervals as jest.Mock).mockResolvedValue(mockIntervals);
    });

    it('should handle cost breakdown when service intervals are selected', async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(<ServiceEntryDialog {...defaultProps} />);

      // Wait for intervals to load
      await waitFor(() => {
        expect(screen.getByText('Oil Change')).toBeInTheDocument();
      });

      // Select intervals
      const oilChangeCheckbox = screen.getByRole('checkbox', { name: /Oil Change/ });
      const tireRotationCheckbox = screen.getByRole('checkbox', { name: /Tire Rotation/ });
      
      fireEvent.click(oilChangeCheckbox);
      fireEvent.click(tireRotationCheckbox);

      // Individual costs should appear
      const costInputs = screen.getAllByPlaceholderText('0.00');
      const oilChangeCostInput = costInputs[costInputs.length - 2]; // Second to last
      const tireRotationCostInput = costInputs[costInputs.length - 1]; // Last

      fireEvent.change(oilChangeCostInput, { target: { value: '45' } });
      fireEvent.change(tireRotationCostInput, { target: { value: '30' } });

      // Fill main form
      fireEvent.change(screen.getByLabelText(/Service Description/), { target: { value: 'Multi Service' } });
      fireEvent.change(screen.getByLabelText(/Total Cost/), { target: { value: '100' } });
      fireEvent.change(screen.getByLabelText('Parts'), { target: { value: '50' } });
      fireEvent.change(screen.getByLabelText('Labor'), { target: { value: '40' } });
      fireEvent.change(screen.getByLabelText('Tax'), { target: { value: '10' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Add Service/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            service_item: 'Multi Service',
            cost: 100,
            parts_cost: 50,
            labor_cost: 40,
            tax: 10,
          }),
          [1, 2], // Selected interval IDs
          [
            { intervalId: 1, cost: 45 },
            { intervalId: 2, cost: 30 },
          ]
        );
      });
    });

    it('should show sum of service items vs invoice total', async () => {
      render(<ServiceEntryDialog {...defaultProps} />);

      // Wait for intervals to load
      await waitFor(() => {
        expect(screen.getByText('Oil Change')).toBeInTheDocument();
      });

      // Select intervals and enter costs
      const oilChangeCheckbox = screen.getByRole('checkbox', { name: /Oil Change/ });
      fireEvent.click(oilChangeCheckbox);

      const costInputs = screen.getAllByPlaceholderText('0.00');
      const intervalCostInput = costInputs[costInputs.length - 1];
      fireEvent.change(intervalCostInput, { target: { value: '45' } });

      // Enter total cost
      fireEvent.change(screen.getByLabelText(/Total Cost/), { target: { value: '100' } });

      // Should show comparison
      await waitFor(() => {
        expect(screen.getByText('Sum of service items:')).toBeInTheDocument();
        expect(screen.getByText('$45.00')).toBeInTheDocument();
        expect(screen.getByText('Invoice total:')).toBeInTheDocument();
        expect(screen.getByText('$100.00')).toBeInTheDocument();
      });
    });
  });

  describe('Edit mode with cost breakdown', () => {
    const existingService: ServiceHistory = {
      id: 1,
      car_id: 1,
      user_id: 1,
      performed_date: '2024-01-01T00:00:00Z',
      service_item: 'Full Service',
      mileage: 50000,
      cost: 300,
      parts_cost: 150,
      labor_cost: 120,
      tax: 30,
      shop: 'Premium Auto',
      created_at: '2024-01-01T00:00:00Z',
    };

    it('should populate cost breakdown fields when editing', () => {
      render(<ServiceEntryDialog {...defaultProps} existingService={existingService} />);

      expect(screen.getByDisplayValue('150')).toBeInTheDocument(); // parts_cost
      expect(screen.getByDisplayValue('120')).toBeInTheDocument(); // labor_cost
      expect(screen.getByDisplayValue('30')).toBeInTheDocument();  // tax
      expect(screen.getByDisplayValue('300')).toBeInTheDocument(); // total cost
    });

    it('should update cost breakdown on edit', async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(<ServiceEntryDialog {...defaultProps} existingService={existingService} />);

      // Update breakdown
      const partsInput = screen.getByLabelText('Parts');
      const laborInput = screen.getByLabelText('Labor');
      const taxInput = screen.getByLabelText('Tax');

      fireEvent.change(partsInput, { target: { value: '200' } });
      fireEvent.change(laborInput, { target: { value: '150' } });
      fireEvent.change(taxInput, { target: { value: '50' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Update Service/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            parts_cost: 200,
            labor_cost: 150,
            tax: 50,
          }),
          [],
          []
        );
      });
    });

    it('should clear breakdown fields when values are deleted', async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(<ServiceEntryDialog {...defaultProps} existingService={existingService} />);

      // Clear all breakdown fields
      const partsInput = screen.getByLabelText('Parts');
      const laborInput = screen.getByLabelText('Labor');
      const taxInput = screen.getByLabelText('Tax');

      fireEvent.change(partsInput, { target: { value: '' } });
      fireEvent.change(laborInput, { target: { value: '' } });
      fireEvent.change(taxInput, { target: { value: '' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: /Update Service/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            parts_cost: undefined,
            labor_cost: undefined,
            tax: undefined,
          }),
          [],
          []
        );
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle very large numbers in breakdown', async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(<ServiceEntryDialog {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Service Description/), { target: { value: 'Engine Rebuild' } });
      fireEvent.change(screen.getByLabelText('Parts'), { target: { value: '5000.99' } });
      fireEvent.change(screen.getByLabelText('Labor'), { target: { value: '3500.50' } });
      fireEvent.change(screen.getByLabelText('Tax'), { target: { value: '765.05' } });

      await waitFor(() => {
        expect(screen.getByText('Breakdown Total: $9266.54')).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /Add Service/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            parts_cost: 5000.99,
            labor_cost: 3500.50,
            tax: 765.05,
          }),
          [],
          []
        );
      });
    });

    it('should handle decimal precision correctly', async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(<ServiceEntryDialog {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Service Description/), { target: { value: 'Service' } });
      fireEvent.change(screen.getByLabelText('Parts'), { target: { value: '10.333' } });
      fireEvent.change(screen.getByLabelText('Labor'), { target: { value: '20.667' } });
      fireEvent.change(screen.getByLabelText('Tax'), { target: { value: '2.48' } });

      await waitFor(() => {
        // Should round to 2 decimal places for display
        expect(screen.getByText('Breakdown Total: $33.48')).toBeInTheDocument();
      });
    });

    it('should handle negative values gracefully', async () => {
      render(<ServiceEntryDialog {...defaultProps} />);

      const partsInput = screen.getByLabelText('Parts');
      fireEvent.change(partsInput, { target: { value: '-50' } });

      // Negative values are technically valid (refunds, discounts)
      fireEvent.change(screen.getByLabelText(/Service Description/), { target: { value: 'Refund' } });
      
      const submitButton = screen.getByRole('button', { name: /Add Service/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            parts_cost: -50,
          }),
          [],
          []
        );
      });
    });

    it('should trim whitespace from numeric inputs', async () => {
      mockOnSave.mockResolvedValue(undefined);
      render(<ServiceEntryDialog {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/Service Description/), { target: { value: 'Service' } });
      
      // Note: In practice, number inputs handle this, but testing the concept
      fireEvent.change(screen.getByLabelText('Parts'), { target: { value: ' 100 ' } });
      fireEvent.change(screen.getByLabelText('Labor'), { target: { value: ' 50 ' } });

      const submitButton = screen.getByRole('button', { name: /Add Service/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            parts_cost: 100,
            labor_cost: 50,
          }),
          [],
          []
        );
      });
    });
  });
});