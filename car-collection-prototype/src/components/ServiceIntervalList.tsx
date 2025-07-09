'use client';

import { useState, useEffect } from 'react';
import { ServiceInterval, Car, ServiceHistory, apiService } from '@/lib/api';

interface ServiceIntervalListProps {
  car: Car;
  intervals: ServiceInterval[];
  onEdit?: (interval: ServiceInterval) => void;
  onDelete?: (interval: ServiceInterval) => void;
  onAddService?: (interval: ServiceInterval) => void;
  refreshTrigger?: number; // Add this to trigger refresh after service is recorded
}

interface ServiceStatus {
  interval: ServiceInterval;
  progressPercent: number;
  status: 'ok' | 'due_soon' | 'overdue';
  nextDueText: string;
  lastServiceText?: string;
}

export default function ServiceIntervalList({
  car,
  intervals,
  onEdit,
  onDelete,
  onAddService,
  refreshTrigger
}: ServiceIntervalListProps) {
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [groupBy, setGroupBy] = useState<'system' | 'priority' | 'none'>('system');
  const [serviceHistory, setServiceHistory] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServiceHistoryAndCalculate();
  }, [intervals, car, refreshTrigger]);

  const loadServiceHistoryAndCalculate = async () => {
    try {
      setLoading(true);
      const history = await apiService.getServiceHistory(car.id);
      setServiceHistory(history);
      calculateServiceStatuses(history);
    } catch (error) {
      console.error('Failed to load service history:', error);
      // Fallback to mock data if service history fails
      calculateServiceStatuses([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateServiceStatuses = (history: ServiceHistory[]) => {
    const statuses: ServiceStatus[] = intervals.map(interval => {
      // Find the most recent service for this interval
      const recentService = history
        .filter(h => h.service_item === interval.service_item)
        .sort((a, b) => new Date(b.performed_date).getTime() - new Date(a.performed_date).getTime())[0];

      let progressPercent = 0;
      let status: 'ok' | 'due_soon' | 'overdue' = 'ok';
      let nextDueText = '';
      let lastServiceText = '';

      if (recentService) {
        // Calculate progress based on actual service history
        const serviceDate = new Date(recentService.performed_date);
        const serviceMileage = recentService.mileage || 0;
        const currentMileage = car.mileage || 0;
        const currentDate = new Date();

        // Calculate progress based on miles and months
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

        // Use the higher of the two progress values
        progressPercent = Math.max(mileageProgress, timeProgress);
        progressPercent = Math.min(progressPercent, 100); // Cap at 100%

        // Determine status based on progress
        if (progressPercent >= 100) {
          status = 'overdue';
        } else if (progressPercent >= 75) {
          status = 'due_soon';
        } else {
          status = 'ok';
        }

        // Format last service text
        const today = new Date();
        const serviceDay = new Date(serviceDate);
        
        // Debug logging
        console.log('Service date calculation debug:');
        console.log('- Raw serviceDate:', serviceDate);
        console.log('- serviceDay object:', serviceDay);
        console.log('- today object:', today);
        console.log('- serviceDay ISO:', serviceDay.toISOString());
        console.log('- today ISO:', today.toISOString());
        
        // Compare dates by setting time to midnight to avoid timezone issues
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const serviceMidnight = new Date(serviceDay.getFullYear(), serviceDay.getMonth(), serviceDay.getDate());
        
        console.log('- todayMidnight:', todayMidnight);
        console.log('- serviceMidnight:', serviceMidnight);
        
        const daysSinceService = Math.floor((todayMidnight.getTime() - serviceMidnight.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log('- daysSinceService:', daysSinceService);
        
        if (daysSinceService === 0) {
          lastServiceText = 'Done today';
        } else if (daysSinceService === 1) {
          lastServiceText = 'Done yesterday';
        } else if (daysSinceService < 30) {
          lastServiceText = `Done ${daysSinceService} days ago`;
        } else {
          const monthsAgo = Math.floor(daysSinceService / 30.44);
          lastServiceText = `Done ${monthsAgo} month${monthsAgo > 1 ? 's' : ''} ago`;
        }
      } else {
        // No service history - calculate based on car age/mileage
        // This is a rough estimate assuming the car has never been serviced
        if (interval.interval_miles) {
          progressPercent = Math.min((car.mileage || 0) / interval.interval_miles * 100, 100);
        } else if (interval.interval_months) {
          // Rough estimate: assume car is 5 years old if no service history
          const estimatedAge = 5 * 12; // 5 years in months
          progressPercent = Math.min((estimatedAge / interval.interval_months) * 100, 100);
        }

        if (progressPercent >= 100) {
          status = 'overdue';
        } else if (progressPercent >= 75) {
          status = 'due_soon';
        }

        lastServiceText = 'No service history';
      }

      nextDueText = getNextDueText(interval, progressPercent, recentService);

      return {
        interval,
        progressPercent: Math.round(progressPercent),
        status,
        nextDueText,
        lastServiceText
      };
    });

    setServiceStatuses(statuses);
  };

  const getNextDueText = (interval: ServiceInterval, progress: number, recentService?: ServiceHistory) => {
    if (progress >= 100) {
      return 'Overdue';
    }

    if (recentService) {
      // Calculate based on actual service history
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

      // Return the more restrictive (shorter) interval
      if (nextDueByMiles && nextDueByDate) {
        const milesRemaining = parseInt(nextDueByMiles.split(' ')[0].replace(/,/g, ''));
        const monthsRemaining = parseInt(nextDueByDate.split(' ')[0]);
        // Rough estimate: 1000 miles per month
        const milesInMonths = monthsRemaining * 1000;
        return milesRemaining < milesInMonths ? nextDueByMiles : nextDueByDate;
      }

      return nextDueByMiles || nextDueByDate || 'Due date varies';
    } else {
      // No service history - estimate based on current progress
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

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-500';
      case 'due_soon':
        return 'bg-yellow-500';
      case 'ok':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'overdue':
        return 'Overdue';
      case 'due_soon':
        return 'Due Soon';
      case 'ok':
        return 'Good';
      default:
        return 'Unknown';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getSystemCategory = (serviceItem: string) => {
    const item = serviceItem.toLowerCase();
    if (item.includes('oil')) return 'Engine';
    if (item.includes('tire') || item.includes('rotation')) return 'Wheels & Tires';
    if (item.includes('brake')) return 'Brakes';
    if (item.includes('fluid') || item.includes('coolant')) return 'Fluids';
    if (item.includes('filter')) return 'Filters';
    if (item.includes('battery')) return 'Electrical';
    return 'General';
  };

  const groupIntervals = (statuses: ServiceStatus[]) => {
    if (groupBy === 'none') return [{ name: 'All Services', items: statuses }];
    
    const grouped = statuses.reduce((acc, status) => {
      const key = groupBy === 'system' 
        ? getSystemCategory(status.interval.service_item)
        : status.interval.priority;
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(status);
      return acc;
    }, {} as Record<string, ServiceStatus[]>);

    return Object.entries(grouped).map(([name, items]) => ({ name, items }));
  };

  const formatCost = (interval: ServiceInterval) => {
    if (interval.cost_estimate_low && interval.cost_estimate_high) {
      const lowCost = Number(interval.cost_estimate_low);
      const highCost = Number(interval.cost_estimate_high);
      return `$${lowCost.toFixed(0)} - $${highCost.toFixed(0)}`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading service schedule...</p>
        </div>
      </div>
    );
  }

  if (intervals.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
        <div className="text-center">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No Service Intervals Set
          </h3>
          <p className="text-slate-600 mb-6">
            Add service intervals to track your vehicle's maintenance schedule.
          </p>
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
            Add Service Intervals
          </button>
        </div>
      </div>
    );
  }

  const groupedStatuses = groupIntervals(serviceStatuses);

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-slate-900">Service Schedule</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Group by:</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'system' | 'priority' | 'none')}
              className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="system">System</option>
              <option value="priority">Priority</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
      </div>

      {/* Service Intervals */}
      {groupedStatuses.map((group, groupIndex) => (
        <div key={groupIndex} className="bg-white rounded-xl border border-slate-200 shadow-sm">
          {groupBy !== 'none' && (
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-900">{group.name}</h3>
              <p className="text-sm text-slate-600">{group.items.length} services</p>
            </div>
          )}
          
          <div className="p-6 space-y-4">
            {group.items.map((status, index) => (
              <div
                key={status.interval.id}
                className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {/* Service Item Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-slate-900">
                      {status.interval.service_item}
                    </h4>
                    <span className={`text-xs font-medium ${getPriorityColor(status.interval.priority)}`}>
                      {status.interval.priority}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-slate-600">
                        {status.nextDueText}
                      </span>
                      <span className={`text-xs font-medium ${
                        status.status === 'overdue' ? 'text-red-600' : 
                        status.status === 'due_soon' ? 'text-yellow-600' : 
                        'text-green-600'
                      }`}>
                        {getStatusText(status.status)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(status.status)}`}
                        style={{ width: `${status.progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    {status.lastServiceText && (
                      <span>{status.lastServiceText}</span>
                    )}
                    {formatCost(status.interval) && (
                      <span>Est. {formatCost(status.interval)}</span>
                    )}
                    {status.interval.source && (
                      <span className="text-xs text-slate-500">
                        Source: {status.interval.source}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {onAddService && (
                    <button
                      onClick={() => onAddService(status.interval)}
                      className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Mark Done
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => onEdit(status.interval)}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(status.interval)}
                      className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}