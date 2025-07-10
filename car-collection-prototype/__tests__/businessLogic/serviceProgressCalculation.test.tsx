import { ServiceInterval, ServiceHistory, Car } from '@/lib/api';

describe('Service Progress Calculation', () => {
  const mockCar: Car = {
    id: 1,
    user_id: 1,
    make: 'Toyota',
    model: 'Camry',
    year: 2020,
    mileage: 50000,
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockInterval: ServiceInterval = {
    id: 1,
    car_id: 1,
    user_id: 1,
    service_item: 'Oil Change',
    interval_miles: 5000,
    interval_months: 6,
    priority: 'high',
    created_at: '2024-01-01T00:00:00Z',
  };

  // Mock the calculation logic from ServiceIntervalList
  const calculateProgress = (
    interval: ServiceInterval,
    car: Car,
    recentService?: ServiceHistory
  ): { progressPercent: number; status: 'ok' | 'due_soon' | 'overdue' } => {
    let progressPercent = 0;
    let status: 'ok' | 'due_soon' | 'overdue' = 'ok';

    if (recentService) {
      const serviceDate = new Date(recentService.performed_date);
      const serviceMileage = recentService.mileage || 0;
      const currentMileage = car.mileage || 0;
      const currentDate = new Date();

      let mileageProgress = 0;
      let timeProgress = 0;

      if (interval.interval_miles && serviceMileage > 0) {
        const milesSinceService = currentMileage - serviceMileage;
        mileageProgress = (milesSinceService / interval.interval_miles) * 100;
      }

      if (interval.interval_months) {
        const monthsSinceService = (currentDate.getTime() - serviceDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        timeProgress = (monthsSinceService / interval.interval_months) * 100;
      }

      progressPercent = Math.max(mileageProgress, timeProgress);
      progressPercent = Math.min(progressPercent, 100);

      if (progressPercent >= 100) {
        status = 'overdue';
      } else if (progressPercent >= 75) {
        status = 'due_soon';
      } else {
        status = 'ok';
      }
    } else {
      // No service history
      if (interval.interval_miles) {
        progressPercent = Math.min((car.mileage || 0) / interval.interval_miles * 100, 100);
      } else if (interval.interval_months) {
        const estimatedAge = 5 * 12; // 5 years in months
        progressPercent = Math.min((estimatedAge / interval.interval_months) * 100, 100);
      }

      if (progressPercent >= 100) {
        status = 'overdue';
      } else if (progressPercent >= 75) {
        status = 'due_soon';
      }
    }

    return { progressPercent: Math.round(progressPercent), status };
  };

  const getNextDueText = (
    interval: ServiceInterval,
    progress: number,
    car: Car,
    recentService?: ServiceHistory
  ): string => {
    if (progress >= 100) {
      return 'Overdue';
    }

    if (recentService) {
      const serviceMileage = recentService.mileage || 0;
      const currentMileage = car.mileage || 0;
      const serviceDate = new Date(recentService.performed_date);
      const currentDate = new Date();

      let nextDueByMiles = '';
      let nextDueByDate = '';

      if (interval.interval_miles && serviceMileage > 0) {
        const nextDueMileage = serviceMileage + interval.interval_miles;
        const milesRemaining = nextDueMileage - currentMileage;
        if (milesRemaining > 0) {
          nextDueByMiles = `${milesRemaining.toLocaleString()} miles remaining`;
        }
      }

      if (interval.interval_months) {
        const nextDueDate = new Date(serviceDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + interval.interval_months);
        const monthsRemaining = Math.ceil((nextDueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        if (monthsRemaining > 0) {
          nextDueByDate = `${monthsRemaining} month${monthsRemaining > 1 ? 's' : ''} remaining`;
        }
      }

      if (nextDueByMiles && nextDueByDate) {
        const milesRemaining = parseInt(nextDueByMiles.split(' ')[0].replace(/,/g, ''));
        const monthsRemaining = parseInt(nextDueByDate.split(' ')[0]);
        const milesInMonths = monthsRemaining * 1000;
        return milesRemaining < milesInMonths ? nextDueByMiles : nextDueByDate;
      }

      return nextDueByMiles || nextDueByDate || 'Due date varies';
    } else {
      if (interval.interval_miles) {
        const remaining = Math.floor((interval.interval_miles * (100 - progress)) / 100);
        return remaining > 0 ? `${remaining.toLocaleString()} miles remaining` : 'Due now';
      }
      if (interval.interval_months) {
        const remaining = Math.floor((interval.interval_months * (100 - progress)) / 100);
        return remaining > 0 ? `${remaining} month${remaining > 1 ? 's' : ''} remaining` : 'Due now';
      }
      return 'Due date varies';
    }
  };

  describe('Progress calculation by mileage', () => {
    it('should calculate correct progress based on miles driven since service', () => {
      const recentService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: new Date().toISOString(),
        service_item: 'Oil Change',
        mileage: 45000, // Service done at 45k miles
        created_at: new Date().toISOString(),
      };

      const result = calculateProgress(mockInterval, mockCar, recentService);

      // Car is at 50k, service at 45k, interval is 5k
      // Progress = (50000 - 45000) / 5000 = 100%
      expect(result.progressPercent).toBe(100);
      expect(result.status).toBe('overdue');
    });

    it('should handle partial progress correctly', () => {
      const recentService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: new Date().toISOString(),
        service_item: 'Oil Change',
        mileage: 48000, // Service done at 48k miles
        created_at: new Date().toISOString(),
      };

      const result = calculateProgress(mockInterval, mockCar, recentService);

      // Car is at 50k, service at 48k, interval is 5k
      // Progress = (50000 - 48000) / 5000 = 40%
      expect(result.progressPercent).toBe(40);
      expect(result.status).toBe('ok');
    });

    it('should show due_soon status at 75% progress', () => {
      const recentService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: new Date().toISOString(),
        service_item: 'Oil Change',
        mileage: 46250, // Service done at 46,250 miles
        created_at: new Date().toISOString(),
      };

      const result = calculateProgress(mockInterval, mockCar, recentService);

      // Car is at 50k, service at 46,250, interval is 5k
      // Progress = (50000 - 46250) / 5000 = 75%
      expect(result.progressPercent).toBe(75);
      expect(result.status).toBe('due_soon');
    });

    it('should handle zero mileage in service record', () => {
      const recentService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: new Date().toISOString(),
        service_item: 'Oil Change',
        mileage: 0, // No mileage recorded
        created_at: new Date().toISOString(),
      };

      const result = calculateProgress(mockInterval, mockCar, recentService);

      // Should use time-based calculation only
      expect(result.progressPercent).toBe(0); // Just serviced today
      expect(result.status).toBe('ok');
    });
  });

  describe('Progress calculation by time', () => {
    it('should calculate correct progress based on time elapsed', () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const recentService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: sixMonthsAgo.toISOString(),
        service_item: 'Oil Change',
        mileage: 50000, // Same mileage as car (hasn't moved)
        created_at: sixMonthsAgo.toISOString(),
      };

      const result = calculateProgress(mockInterval, mockCar, recentService);

      // 6 months elapsed, interval is 6 months
      // Progress = 6 / 6 = 100% (might be 99% due to rounding)
      expect(result.progressPercent).toBeGreaterThanOrEqual(99);
      expect(result.progressPercent).toBeLessThanOrEqual(100);
      // Status could be 'due_soon' if progress is exactly 99%
      expect(['due_soon', 'overdue']).toContain(result.status);
    });

    it('should handle partial time progress', () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const recentService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: threeMonthsAgo.toISOString(),
        service_item: 'Oil Change',
        mileage: 50000,
        created_at: threeMonthsAgo.toISOString(),
      };

      const result = calculateProgress(mockInterval, mockCar, recentService);

      // 3 months elapsed, interval is 6 months
      // Progress = 3 / 6 = 50%
      expect(result.progressPercent).toBe(50);
      expect(result.status).toBe('ok');
    });
  });

  describe('Progress calculation using higher of mileage or time', () => {
    it('should use mileage progress when it is higher than time progress', () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const recentService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: oneMonthAgo.toISOString(),
        service_item: 'Oil Change',
        mileage: 45000, // Driven 5k miles in 1 month
        created_at: oneMonthAgo.toISOString(),
      };

      const result = calculateProgress(mockInterval, mockCar, recentService);

      // Mileage progress: (50000 - 45000) / 5000 = 100%
      // Time progress: 1 / 6 = 16.67%
      // Should use the higher value (100%)
      expect(result.progressPercent).toBe(100);
      expect(result.status).toBe('overdue');
    });

    it('should use time progress when it is higher than mileage progress', () => {
      const fiveMonthsAgo = new Date();
      fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

      const recentService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: fiveMonthsAgo.toISOString(),
        service_item: 'Oil Change',
        mileage: 49000, // Only driven 1k miles in 5 months
        created_at: fiveMonthsAgo.toISOString(),
      };

      const result = calculateProgress(mockInterval, mockCar, recentService);

      // Mileage progress: (50000 - 49000) / 5000 = 20%
      // Time progress: 5 / 6 = 83.33%
      // Should use the higher value (82-83% due to rounding)
      expect(result.progressPercent).toBeGreaterThanOrEqual(82);
      expect(result.progressPercent).toBeLessThanOrEqual(84);
      expect(result.status).toBe('due_soon');
    });
  });

  describe('Progress calculation without service history', () => {
    it('should estimate progress based on current mileage when no history exists', () => {
      const result = calculateProgress(mockInterval, mockCar, undefined);

      // Car has 50k miles, interval is 5k
      // Progress = 50000 / 5000 = 1000% (capped at 100%)
      expect(result.progressPercent).toBe(100);
      expect(result.status).toBe('overdue');
    });

    it('should handle low mileage cars correctly', () => {
      const lowMileageCar: Car = {
        ...mockCar,
        mileage: 2500,
      };

      const result = calculateProgress(mockInterval, lowMileageCar, undefined);

      // Car has 2.5k miles, interval is 5k
      // Progress = 2500 / 5000 = 50%
      expect(result.progressPercent).toBe(50);
      expect(result.status).toBe('ok');
    });

    it('should use estimated age for time-based intervals when no history', () => {
      const timeOnlyInterval: ServiceInterval = {
        ...mockInterval,
        interval_miles: undefined,
        interval_months: 12, // Annual service
      };

      const result = calculateProgress(timeOnlyInterval, mockCar, undefined);

      // Estimated age is 5 years (60 months)
      // Progress = 60 / 12 = 500% (capped at 100%)
      expect(result.progressPercent).toBe(100);
      expect(result.status).toBe('overdue');
    });
  });

  describe('Next due text calculation', () => {
    it('should show "Overdue" when progress is 100% or more', () => {
      const text = getNextDueText(mockInterval, 100, mockCar);
      expect(text).toBe('Overdue');
    });

    it('should calculate miles remaining correctly', () => {
      const recentService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: new Date().toISOString(),
        service_item: 'Oil Change',
        mileage: 48000,
        created_at: new Date().toISOString(),
      };

      const text = getNextDueText(mockInterval, 40, mockCar, recentService);
      
      // Next due at 48k + 5k = 53k, current is 50k
      // Remaining = 53k - 50k = 3k
      expect(text).toBe('3,000 miles remaining');
    });

    it('should calculate months remaining correctly', () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const recentService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: twoMonthsAgo.toISOString(),
        service_item: 'Oil Change',
        mileage: 50000, // No miles driven
        created_at: twoMonthsAgo.toISOString(),
      };

      const text = getNextDueText(mockInterval, 33, mockCar, recentService);
      
      // Next due in 6 months from service, 2 months elapsed
      // Remaining = 6 - 2 = 4 months (or 5 due to rounding)
      expect(text).toMatch(/^[45] months remaining$/);
    });

    it('should choose the more restrictive interval when both exist', () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      const recentService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: oneMonthAgo.toISOString(),
        service_item: 'Oil Change',
        mileage: 49500, // 500 miles to go
        created_at: oneMonthAgo.toISOString(),
      };

      const text = getNextDueText(mockInterval, 10, mockCar, recentService);
      
      // Miles remaining: 49500 + 5000 - 50000 = 4500
      // Months remaining: 6 - 1 = 5 (equivalent to ~5000 miles at 1000/month)
      // Should choose miles as it's more restrictive
      expect(text).toBe('4,500 miles remaining');
    });

    it('should handle no service history in next due text', () => {
      const text = getNextDueText(mockInterval, 50, mockCar, undefined);
      
      // 50% progress means 50% of interval remaining
      // 5000 * 0.5 = 2500 miles
      expect(text).toBe('2,500 miles remaining');
    });
  });

  describe('Edge cases', () => {
    it('should cap progress at 100%', () => {
      const veryOldService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: '2020-01-01T00:00:00Z', // Years ago
        service_item: 'Oil Change',
        mileage: 10000,
        created_at: '2020-01-01T00:00:00Z',
      };

      const result = calculateProgress(mockInterval, mockCar, veryOldService);

      // Progress should be capped at 100 even though actual would be much higher
      expect(result.progressPercent).toBe(100);
      expect(result.status).toBe('overdue');
    });

    it('should handle negative progress (service date in future)', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const futureService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: tomorrow.toISOString(),
        service_item: 'Oil Change',
        mileage: 50000,
        created_at: tomorrow.toISOString(),
      };

      const result = calculateProgress(mockInterval, mockCar, futureService);

      // Should handle gracefully
      expect(result.progressPercent).toBe(0);
      expect(result.status).toBe('ok');
    });

    it('should handle missing interval values', () => {
      const noIntervalData: ServiceInterval = {
        ...mockInterval,
        interval_miles: undefined,
        interval_months: undefined,
      };

      const result = calculateProgress(noIntervalData, mockCar, undefined);

      expect(result.progressPercent).toBe(0);
      expect(result.status).toBe('ok');
    });

    it('should handle zero interval values', () => {
      const zeroInterval: ServiceInterval = {
        ...mockInterval,
        interval_miles: 0,
        interval_months: 0,
      };

      const recentService: ServiceHistory = {
        id: 1,
        car_id: 1,
        user_id: 1,
        performed_date: new Date().toISOString(),
        service_item: 'Oil Change',
        mileage: 45000,
        created_at: new Date().toISOString(),
      };

      const result = calculateProgress(zeroInterval, mockCar, recentService);

      // Should not divide by zero
      expect(result.progressPercent).toBe(0);
      expect(result.status).toBe('ok');
    });
  });

  describe('Date display edge cases', () => {
    it('should correctly identify "Done today"', () => {
      const today = new Date();
      const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const getLastServiceText = (serviceDate: Date): string => {
        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const serviceMidnight = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate());
        
        const daysSinceService = Math.floor((todayMidnight.getTime() - serviceMidnight.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceService === 0) {
          return 'Done today';
        } else if (daysSinceService === 1) {
          return 'Done yesterday';
        } else if (daysSinceService < 30) {
          return `Done ${daysSinceService} days ago`;
        } else {
          const monthsAgo = Math.floor(daysSinceService / 30.44);
          return `Done ${monthsAgo} month${monthsAgo > 1 ? 's' : ''} ago`;
        }
      };

      const text = getLastServiceText(today);
      expect(text).toBe('Done today');
    });

    it('should correctly identify "Done yesterday"', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const getLastServiceText = (serviceDate: Date): string => {
        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const serviceMidnight = new Date(serviceDate.getFullYear(), serviceDate.getMonth(), serviceDate.getDate());
        
        const daysSinceService = Math.floor((todayMidnight.getTime() - serviceMidnight.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceService === 0) {
          return 'Done today';
        } else if (daysSinceService === 1) {
          return 'Done yesterday';
        } else if (daysSinceService < 30) {
          return `Done ${daysSinceService} days ago`;
        } else {
          const monthsAgo = Math.floor(daysSinceService / 30.44);
          return `Done ${monthsAgo} month${monthsAgo > 1 ? 's' : ''} ago`;
        }
      };

      const text = getLastServiceText(yesterday);
      expect(text).toBe('Done yesterday');
    });
  });
});