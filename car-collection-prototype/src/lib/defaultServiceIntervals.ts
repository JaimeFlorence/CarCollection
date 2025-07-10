import { ServiceIntervalCreate } from './api';

// Default service intervals based on common maintenance needs
// These can be used as fallback when research doesn't return specific results
export const DEFAULT_SERVICE_INTERVALS: Omit<ServiceIntervalCreate, 'car_id'>[] = [
  {
    service_item: 'Oil Change',
    interval_miles: 5000,
    interval_months: 6,
    priority: 'high',
    cost_estimate_low: 30,
    cost_estimate_high: 80,
    notes: 'Regular oil changes are crucial for engine health',
    source: 'default_schedule'
  },
  {
    service_item: 'Tire Rotation',
    interval_miles: 7500,
    interval_months: 6,
    priority: 'medium',
    cost_estimate_low: 20,
    cost_estimate_high: 50,
    notes: 'Ensures even tire wear and extends tire life',
    source: 'default_schedule'
  },
  {
    service_item: 'Air Filter Replacement',
    interval_miles: 15000,
    interval_months: 12,
    priority: 'medium',
    cost_estimate_low: 15,
    cost_estimate_high: 40,
    notes: 'Clean air filter improves fuel efficiency and engine performance',
    source: 'default_schedule'
  },
  {
    service_item: 'Brake Inspection',
    interval_miles: 20000,
    interval_months: 24,
    priority: 'high',
    cost_estimate_low: 50,
    cost_estimate_high: 150,
    notes: 'Regular brake inspections ensure safety',
    source: 'default_schedule'
  },
  {
    service_item: 'Transmission Service',
    interval_miles: 60000,
    interval_months: 60,
    priority: 'high',
    cost_estimate_low: 150,
    cost_estimate_high: 400,
    notes: 'Transmission fluid change extends transmission life',
    source: 'default_schedule'
  },
  {
    service_item: 'Coolant Flush',
    interval_miles: 30000,
    interval_months: 36,
    priority: 'medium',
    cost_estimate_low: 80,
    cost_estimate_high: 150,
    notes: 'Prevents overheating and corrosion in cooling system',
    source: 'default_schedule'
  },
  {
    service_item: 'Spark Plugs',
    interval_miles: 30000,
    interval_months: 36,
    priority: 'medium',
    cost_estimate_low: 40,
    cost_estimate_high: 120,
    notes: 'Ensures proper combustion and fuel efficiency',
    source: 'default_schedule'
  },
  {
    service_item: 'Battery Check',
    interval_miles: null,
    interval_months: 12,
    priority: 'medium',
    cost_estimate_low: 0,
    cost_estimate_high: 20,
    notes: 'Annual battery testing prevents unexpected failures',
    source: 'default_schedule'
  },
  {
    service_item: 'Brake Fluid',
    interval_miles: 30000,
    interval_months: 36,
    priority: 'high',
    cost_estimate_low: 70,
    cost_estimate_high: 120,
    notes: 'Fresh brake fluid maintains braking performance',
    source: 'default_schedule'
  },
  {
    service_item: 'Cabin Air Filter',
    interval_miles: 15000,
    interval_months: 12,
    priority: 'low',
    cost_estimate_low: 20,
    cost_estimate_high: 50,
    notes: 'Keeps cabin air clean and HVAC system efficient',
    source: 'default_schedule'
  }
];

// Convert to the format expected by the research API
export function getDefaultServiceIntervalsForResearch() {
  return DEFAULT_SERVICE_INTERVALS.map(interval => ({
    ...interval,
    interval_miles: interval.interval_miles || undefined,
    interval_months: interval.interval_months || undefined,
    confidence_score: 0.7, // Medium confidence for defaults
    source: 'default_schedule'
  }));
}