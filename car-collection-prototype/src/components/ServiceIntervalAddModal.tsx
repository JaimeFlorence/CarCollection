'use client';

import { useState } from 'react';
import { ServiceIntervalCreate } from '@/lib/api';

interface ServiceIntervalAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (interval: ServiceIntervalCreate) => Promise<void>;
  carId: number;
}

// Predefined categories based on the getSystemCategory function
const SERVICE_CATEGORIES = [
  'Engine',
  'Wheels & Tires',
  'Brakes',
  'Fluids',
  'Filters',
  'Electrical',
  'Transmission',
  'Suspension',
  'Exhaust',
  'Body & Interior',
  'General',
  'Custom'
];

// Common service items by category
const COMMON_SERVICES: Record<string, string[]> = {
  'Engine': ['Oil Change', 'Spark Plugs', 'Air Filter', 'Engine Coolant', 'Drive Belt'],
  'Wheels & Tires': ['Tire Rotation', 'Tire Replacement', 'Wheel Alignment', 'Wheel Balance'],
  'Brakes': ['Brake Pads', 'Brake Fluid', 'Brake Rotors', 'Brake Lines Inspection'],
  'Fluids': ['Transmission Fluid', 'Power Steering Fluid', 'Windshield Washer Fluid', 'Differential Fluid'],
  'Filters': ['Cabin Air Filter', 'Fuel Filter', 'Transmission Filter'],
  'Electrical': ['Battery', 'Alternator', 'Starter Motor', 'Fuses'],
  'Transmission': ['Transmission Service', 'Clutch Replacement', 'CV Joint'],
  'Suspension': ['Shocks/Struts', 'Control Arms', 'Ball Joints', 'Sway Bar Links'],
  'Exhaust': ['Muffler', 'Catalytic Converter', 'Exhaust Pipes'],
  'Body & Interior': ['Wiper Blades', 'Interior Detailing', 'Exterior Wash & Wax'],
  'General': ['Annual Inspection', 'Multi-Point Inspection', 'Scheduled Maintenance'],
};

export default function ServiceIntervalAddModal({
  isOpen,
  onClose,
  onSave,
  carId
}: ServiceIntervalAddModalProps) {
  const [selectedCategory, setSelectedCategory] = useState('Engine');
  const [customServiceName, setCustomServiceName] = useState('');
  const [formData, setFormData] = useState({
    service_item: '',
    interval_miles: '',
    interval_months: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    cost_estimate_low: '',
    cost_estimate_high: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category !== 'Custom') {
      setCustomServiceName('');
      setFormData({ ...formData, service_item: '' });
    }
  };

  const handleServiceItemSelect = (item: string) => {
    setFormData({ ...formData, service_item: item });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const serviceItem = selectedCategory === 'Custom' ? customServiceName : formData.service_item;
    if (!serviceItem) {
      alert('Please select or enter a service item');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        car_id: carId,
        service_item: serviceItem,
        interval_miles: formData.interval_miles ? parseInt(formData.interval_miles) : undefined,
        interval_months: formData.interval_months ? parseInt(formData.interval_months) : undefined,
        priority: formData.priority,
        cost_estimate_low: formData.cost_estimate_low ? parseFloat(formData.cost_estimate_low) : undefined,
        cost_estimate_high: formData.cost_estimate_high ? parseFloat(formData.cost_estimate_high) : undefined,
        notes: formData.notes || undefined,
        source: 'user_entered'
      });
      
      // Reset form
      setFormData({
        service_item: '',
        interval_miles: '',
        interval_months: '',
        priority: 'medium',
        cost_estimate_low: '',
        cost_estimate_high: '',
        notes: ''
      });
      setCustomServiceName('');
      setSelectedCategory('Engine');
      
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to add service interval. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900">Add Service Interval</h2>
          <p className="text-slate-600 mt-1">Create a new service interval for your vehicle</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Service Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SERVICE_CATEGORIES.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Service Item Selection/Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Service Item
            </label>
            {selectedCategory === 'Custom' ? (
              <input
                type="text"
                value={customServiceName}
                onChange={(e) => setCustomServiceName(e.target.value)}
                placeholder="Enter custom service name"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 mb-3">
                  {COMMON_SERVICES[selectedCategory]?.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleServiceItemSelect(item)}
                      className={`px-4 py-2 text-left rounded-lg border transition-colors ${
                        formData.service_item === item
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.service_item}
                  onChange={(e) => setFormData({ ...formData, service_item: e.target.value })}
                  placeholder="Or type a custom service item"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Interval Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Interval (Miles)
              </label>
              <input
                type="number"
                value={formData.interval_miles}
                onChange={(e) => setFormData({ ...formData, interval_miles: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 5000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Interval (Months)
              </label>
              <input
                type="number"
                value={formData.interval_months}
                onChange={(e) => setFormData({ ...formData, interval_months: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 6"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Cost Estimates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Minimum Cost Estimate ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cost_estimate_low}
                onChange={(e) => setFormData({ ...formData, cost_estimate_low: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 50.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Maximum Cost Estimate ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cost_estimate_high}
                onChange={(e) => setFormData({ ...formData, cost_estimate_high: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 80.00"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional notes about this service..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Adding...
                </>
              ) : (
                'Add Service Interval'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}