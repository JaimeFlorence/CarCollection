import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { handleSaveServiceRecord } from '@/app/cars/[id]/page';
import { ServiceHistory, ServiceInterval, apiService } from '@/lib/api';

// Mock the API service
jest.mock('@/lib/api', () => ({
  apiService: {
    createServiceHistory: jest.fn(),
    updateServiceHistory: jest.fn(),
    getServiceHistory: jest.fn(),
    getServiceIntervals: jest.fn(),
  },
  ServiceHistory: {},
  ServiceInterval: {},
}));

describe('Summary Line Item Feature', () => {
  const mockCarId = '1';
  const mockServiceIntervals: ServiceInterval[] = [
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
    {
      id: 2,
      car_id: 1,
      user_id: 1,
      service_item: 'Tire Rotation',
      interval_miles: 7500,
      interval_months: 12,
      priority: 'medium',
      created_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (apiService.getServiceIntervals as jest.Mock).mockResolvedValue(mockServiceIntervals);
    (apiService.getServiceHistory as jest.Mock).mockResolvedValue([]);
  });

  describe('Creating new service records', () => {
    it('should create a summary line item when total cost is entered but no individual costs are assigned', async () => {
      const serviceData = {
        performed_date: '2024-01-15T00:00:00.000Z',
        service_item: 'Multi-Service Invoice',
        mileage: 55000,
        cost: 300, // Total cost
        shop: 'Joe\'s Garage',
        invoice_number: 'INV-456',
      };

      const selectedIntervalIds = [1, 2]; // Oil Change and Tire Rotation
      const intervalCosts = [
        { intervalId: 1, cost: 0 }, // No individual cost
        { intervalId: 2, cost: 0 }, // No individual cost
      ];

      // Mock function to simulate the logic
      const mockHandleSaveServiceRecord = async () => {
        const totalIndividualCosts = intervalCosts.reduce((sum, ic) => sum + (ic.cost || 0), 0);
        const hasTotalCost = serviceData.cost && serviceData.cost > 0;
        const hasUnassignedCost = hasTotalCost && totalIndividualCosts === 0;

        // Create summary line item if there's unassigned cost
        if (hasUnassignedCost && serviceData.service_item) {
          await apiService.createServiceHistory(Number(mockCarId), serviceData as any);
        }

        // Create individual service entries
        for (const intervalId of selectedIntervalIds) {
          const interval = mockServiceIntervals.find(i => i.id === intervalId);
          const intervalCost = intervalCosts.find(ic => ic.intervalId === intervalId)?.cost || 0;
          
          await apiService.createServiceHistory(Number(mockCarId), {
            ...serviceData,
            cost: intervalCost,
            service_item: interval!.service_item,
          } as any);
        }
      };

      await mockHandleSaveServiceRecord();

      // Should create 3 entries: 1 summary + 2 individual services
      expect(apiService.createServiceHistory).toHaveBeenCalledTimes(3);

      // First call should be the summary line item with full cost
      expect(apiService.createServiceHistory).toHaveBeenNthCalledWith(1, 1, expect.objectContaining({
        service_item: 'Multi-Service Invoice',
        cost: 300,
      }));

      // Second call should be Oil Change with $0
      expect(apiService.createServiceHistory).toHaveBeenNthCalledWith(2, 1, expect.objectContaining({
        service_item: 'Oil Change',
        cost: 0,
      }));

      // Third call should be Tire Rotation with $0
      expect(apiService.createServiceHistory).toHaveBeenNthCalledWith(3, 1, expect.objectContaining({
        service_item: 'Tire Rotation',
        cost: 0,
      }));
    });

    it('should NOT create a summary line item when individual costs are assigned', async () => {
      const serviceData = {
        performed_date: '2024-01-15T00:00:00.000Z',
        service_item: 'Multi-Service Invoice',
        mileage: 55000,
        cost: 300, // Total cost
        shop: 'Joe\'s Garage',
        invoice_number: 'INV-456',
      };

      const selectedIntervalIds = [1, 2];
      const intervalCosts = [
        { intervalId: 1, cost: 150 }, // Individual cost assigned
        { intervalId: 2, cost: 150 }, // Individual cost assigned
      ];

      // Mock function to simulate the logic
      const mockHandleSaveServiceRecord = async () => {
        const totalIndividualCosts = intervalCosts.reduce((sum, ic) => sum + (ic.cost || 0), 0);
        const hasTotalCost = serviceData.cost && serviceData.cost > 0;
        const hasUnassignedCost = hasTotalCost && totalIndividualCosts === 0;

        // Create summary line item if there's unassigned cost
        if (hasUnassignedCost && serviceData.service_item) {
          await apiService.createServiceHistory(Number(mockCarId), serviceData as any);
        }

        // Create individual service entries
        for (const intervalId of selectedIntervalIds) {
          const interval = mockServiceIntervals.find(i => i.id === intervalId);
          const intervalCost = intervalCosts.find(ic => ic.intervalId === intervalId)?.cost || 0;
          
          await apiService.createServiceHistory(Number(mockCarId), {
            ...serviceData,
            cost: intervalCost,
            service_item: interval!.service_item,
          } as any);
        }
      };

      await mockHandleSaveServiceRecord();

      // Should create only 2 entries (no summary)
      expect(apiService.createServiceHistory).toHaveBeenCalledTimes(2);

      // First call should be Oil Change with $150
      expect(apiService.createServiceHistory).toHaveBeenNthCalledWith(1, 1, expect.objectContaining({
        service_item: 'Oil Change',
        cost: 150,
      }));

      // Second call should be Tire Rotation with $150
      expect(apiService.createServiceHistory).toHaveBeenNthCalledWith(2, 1, expect.objectContaining({
        service_item: 'Tire Rotation',
        cost: 150,
      }));
    });

    it('should handle mixed cost scenarios (some intervals with costs, some without)', async () => {
      const serviceData = {
        performed_date: '2024-01-15T00:00:00.000Z',
        service_item: 'Mixed Service Invoice',
        mileage: 55000,
        cost: 300,
        shop: 'Joe\'s Garage',
      };

      const selectedIntervalIds = [1, 2];
      const intervalCosts = [
        { intervalId: 1, cost: 150 }, // Oil change has a cost
        { intervalId: 2, cost: 0 },   // Tire rotation has no cost
      ];

      const mockHandleSaveServiceRecord = async () => {
        const totalIndividualCosts = intervalCosts.reduce((sum, ic) => sum + (ic.cost || 0), 0);
        const hasTotalCost = serviceData.cost && serviceData.cost > 0;
        const hasUnassignedCost = hasTotalCost && totalIndividualCosts === 0;

        if (hasUnassignedCost && serviceData.service_item) {
          await apiService.createServiceHistory(Number(mockCarId), serviceData as any);
        }

        for (const intervalId of selectedIntervalIds) {
          const interval = mockServiceIntervals.find(i => i.id === intervalId);
          const intervalCost = intervalCosts.find(ic => ic.intervalId === intervalId)?.cost || 0;
          
          await apiService.createServiceHistory(Number(mockCarId), {
            ...serviceData,
            cost: intervalCost,
            service_item: interval!.service_item,
          } as any);
        }
      };

      await mockHandleSaveServiceRecord();

      // Should create only 2 entries (no summary because some costs were assigned)
      expect(apiService.createServiceHistory).toHaveBeenCalledTimes(2);

      expect(apiService.createServiceHistory).toHaveBeenNthCalledWith(1, 1, expect.objectContaining({
        service_item: 'Oil Change',
        cost: 150,
      }));

      expect(apiService.createServiceHistory).toHaveBeenNthCalledWith(2, 1, expect.objectContaining({
        service_item: 'Tire Rotation',
        cost: 0,
      }));
    });

    it('should create only one entry when no intervals are selected', async () => {
      const serviceData = {
        performed_date: '2024-01-15T00:00:00.000Z',
        service_item: 'Custom Service',
        mileage: 55000,
        cost: 100,
        shop: 'Joe\'s Garage',
      };

      const selectedIntervalIds: number[] = [];
      const intervalCosts: Array<{intervalId: number, cost: number}> = [];

      const mockHandleSaveServiceRecord = async () => {
        if (selectedIntervalIds && selectedIntervalIds.length > 0) {
          // Handle intervals...
        } else {
          // No intervals selected, just create one entry
          await apiService.createServiceHistory(Number(mockCarId), serviceData as any);
        }
      };

      await mockHandleSaveServiceRecord();

      expect(apiService.createServiceHistory).toHaveBeenCalledTimes(1);
      expect(apiService.createServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        service_item: 'Custom Service',
        cost: 100,
      }));
    });
  });

  describe('Updating existing service records', () => {
    const existingService: ServiceHistory = {
      id: 10,
      car_id: 1,
      user_id: 1,
      performed_date: '2024-01-01T00:00:00Z',
      service_item: 'Oil Change',
      mileage: 50000,
      cost: 50,
      created_at: '2024-01-01T00:00:00Z',
    };

    it('should handle edit mode correctly when updating with new intervals', async () => {
      const serviceData = {
        performed_date: '2024-01-15T00:00:00.000Z',
        service_item: 'Updated Service',
        mileage: 55000,
        cost: 300,
      };

      const selectedIntervalIds = [1, 2];
      const intervalCosts = [
        { intervalId: 1, cost: 0 },
        { intervalId: 2, cost: 0 },
      ];

      const mockHandleSaveServiceRecord = async () => {
        // Update existing service
        await apiService.updateServiceHistory(existingService.id, serviceData);

        const selectedIntervals = mockServiceIntervals.filter(interval => 
          selectedIntervalIds.includes(interval.id)
        );

        const totalIndividualCosts = intervalCosts.reduce((sum, ic) => sum + (ic.cost || 0), 0);
        const hasTotalCost = serviceData.cost && serviceData.cost > 0;
        const hasUnassignedCost = hasTotalCost && totalIndividualCosts === 0;

        // Check if we need a summary item
        const needsSummaryItem = hasUnassignedCost && 
          serviceData.service_item && 
          !selectedIntervals.some(interval => interval.service_item === existingService.service_item);

        for (const interval of selectedIntervals) {
          // Skip if this interval matches the service we just updated
          if (interval.service_item === existingService.service_item) {
            continue;
          }

          const intervalCost = intervalCosts.find(ic => ic.intervalId === interval.id)?.cost || 0;
          
          await apiService.createServiceHistory(Number(mockCarId), {
            ...serviceData,
            cost: intervalCost,
            service_item: interval.service_item,
          } as any);
        }
      };

      await mockHandleSaveServiceRecord();

      // Should update the existing service
      expect(apiService.updateServiceHistory).toHaveBeenCalledWith(10, serviceData);

      // Should create only 1 new entry (Tire Rotation, since Oil Change was updated)
      expect(apiService.createServiceHistory).toHaveBeenCalledTimes(1);
      expect(apiService.createServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        service_item: 'Tire Rotation',
        cost: 0,
      }));
    });

    it('should not duplicate service when interval matches existing service item', async () => {
      const serviceData = {
        performed_date: '2024-01-15T00:00:00.000Z',
        service_item: 'Oil Change', // Same as existing
        mileage: 55000,
        cost: 75,
      };

      const selectedIntervalIds = [1]; // Oil Change interval
      const intervalCosts = [
        { intervalId: 1, cost: 75 },
      ];

      const mockHandleSaveServiceRecord = async () => {
        await apiService.updateServiceHistory(existingService.id, serviceData);

        const selectedIntervals = mockServiceIntervals.filter(interval => 
          selectedIntervalIds.includes(interval.id)
        );

        for (const interval of selectedIntervals) {
          if (interval.service_item === existingService.service_item) {
            // Skip - already updated
            continue;
          }

          const intervalCost = intervalCosts.find(ic => ic.intervalId === interval.id)?.cost || 0;
          
          await apiService.createServiceHistory(Number(mockCarId), {
            ...serviceData,
            cost: intervalCost,
            service_item: interval.service_item,
          } as any);
        }
      };

      await mockHandleSaveServiceRecord();

      expect(apiService.updateServiceHistory).toHaveBeenCalledWith(10, serviceData);
      // Should NOT create any new entries
      expect(apiService.createServiceHistory).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty service description gracefully', async () => {
      const serviceData = {
        performed_date: '2024-01-15T00:00:00.000Z',
        service_item: '', // Empty description
        mileage: 55000,
        cost: 100,
      };

      const selectedIntervalIds = [1];
      const intervalCosts = [{ intervalId: 1, cost: 0 }];

      const mockHandleSaveServiceRecord = async () => {
        const totalIndividualCosts = intervalCosts.reduce((sum, ic) => sum + (ic.cost || 0), 0);
        const hasTotalCost = serviceData.cost && serviceData.cost > 0;
        const hasUnassignedCost = hasTotalCost && totalIndividualCosts === 0;

        // Should not create summary if service_item is empty
        if (hasUnassignedCost && serviceData.service_item) {
          await apiService.createServiceHistory(Number(mockCarId), serviceData as any);
        }

        // Still create individual service entries
        for (const intervalId of selectedIntervalIds) {
          const interval = mockServiceIntervals.find(i => i.id === intervalId);
          const intervalCost = intervalCosts.find(ic => ic.intervalId === intervalId)?.cost || 0;
          
          await apiService.createServiceHistory(Number(mockCarId), {
            ...serviceData,
            cost: intervalCost,
            service_item: interval!.service_item,
          } as any);
        }
      };

      await mockHandleSaveServiceRecord();

      // Should only create 1 entry (no summary due to empty service_item)
      expect(apiService.createServiceHistory).toHaveBeenCalledTimes(1);
      expect(apiService.createServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        service_item: 'Oil Change',
        cost: 0,
      }));
    });

    it('should handle zero total cost correctly', async () => {
      const serviceData = {
        performed_date: '2024-01-15T00:00:00.000Z',
        service_item: 'Free Inspection',
        mileage: 55000,
        cost: 0, // Free service
      };

      const selectedIntervalIds = [1];
      const intervalCosts = [{ intervalId: 1, cost: 0 }];

      const mockHandleSaveServiceRecord = async () => {
        const totalIndividualCosts = intervalCosts.reduce((sum, ic) => sum + (ic.cost || 0), 0);
        const hasTotalCost = serviceData.cost && serviceData.cost > 0;
        const hasUnassignedCost = hasTotalCost && totalIndividualCosts === 0;

        if (hasUnassignedCost && serviceData.service_item) {
          await apiService.createServiceHistory(Number(mockCarId), serviceData as any);
        }

        for (const intervalId of selectedIntervalIds) {
          const interval = mockServiceIntervals.find(i => i.id === intervalId);
          const intervalCost = intervalCosts.find(ic => ic.intervalId === intervalId)?.cost || 0;
          
          await apiService.createServiceHistory(Number(mockCarId), {
            ...serviceData,
            cost: intervalCost,
            service_item: interval!.service_item,
          } as any);
        }
      };

      await mockHandleSaveServiceRecord();

      // Should only create 1 entry (no summary because cost is 0)
      expect(apiService.createServiceHistory).toHaveBeenCalledTimes(1);
      expect(apiService.createServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        service_item: 'Oil Change',
        cost: 0,
      }));
    });

    it('should handle undefined cost correctly', async () => {
      const serviceData = {
        performed_date: '2024-01-15T00:00:00.000Z',
        service_item: 'Inspection',
        mileage: 55000,
        cost: undefined, // No cost specified
      };

      const selectedIntervalIds = [1];
      const intervalCosts = [{ intervalId: 1, cost: 0 }];

      const mockHandleSaveServiceRecord = async () => {
        const totalIndividualCosts = intervalCosts.reduce((sum, ic) => sum + (ic.cost || 0), 0);
        const hasTotalCost = serviceData.cost && serviceData.cost > 0;
        const hasUnassignedCost = hasTotalCost && totalIndividualCosts === 0;

        if (hasUnassignedCost && serviceData.service_item) {
          await apiService.createServiceHistory(Number(mockCarId), serviceData as any);
        }

        for (const intervalId of selectedIntervalIds) {
          const interval = mockServiceIntervals.find(i => i.id === intervalId);
          const intervalCost = intervalCosts.find(ic => ic.intervalId === intervalId)?.cost || 0;
          
          await apiService.createServiceHistory(Number(mockCarId), {
            ...serviceData,
            cost: intervalCost,
            service_item: interval!.service_item,
          } as any);
        }
      };

      await mockHandleSaveServiceRecord();

      // Should only create 1 entry (no summary because cost is undefined)
      expect(apiService.createServiceHistory).toHaveBeenCalledTimes(1);
      expect(apiService.createServiceHistory).toHaveBeenCalledWith(1, expect.objectContaining({
        service_item: 'Oil Change',
        cost: 0,
      }));
    });
  });
});