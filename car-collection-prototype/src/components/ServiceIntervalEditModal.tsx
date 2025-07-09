'use client';

import { useState, useEffect } from 'react';
import { ServiceInterval } from '@/lib/api';

interface ServiceIntervalEditModalProps {
  interval: ServiceInterval | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (interval: Partial<ServiceInterval>) => Promise<void>;
}

export default function ServiceIntervalEditModal({
  interval,
  isOpen,
  onClose,
  onSave
}: ServiceIntervalEditModalProps) {
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

  useEffect(() => {
    if (interval) {
      setFormData({
        service_item: interval.service_item,
        interval_miles: interval.interval_miles?.toString() || '',
        interval_months: interval.interval_months?.toString() || '',
        priority: interval.priority,
        cost_estimate_low: interval.cost_estimate_low?.toString() || '',
        cost_estimate_high: interval.cost_estimate_high?.toString() || '',
        notes: interval.notes || ''
      });
    }
  }, [interval]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interval) return;

    setSaving(true);
    try {
      await onSave({
        service_item: formData.service_item,
        interval_miles: formData.interval_miles ? parseInt(formData.interval_miles) : undefined,
        interval_months: formData.interval_months ? parseInt(formData.interval_months) : undefined,
        priority: formData.priority,
        cost_estimate_low: formData.cost_estimate_low ? parseFloat(formData.cost_estimate_low) : undefined,
        cost_estimate_high: formData.cost_estimate_high ? parseFloat(formData.cost_estimate_high) : undefined,
        notes: formData.notes || undefined
      });
      onClose();
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900">Edit Service Interval</h2>
          <p className="text-slate-600 mt-1">Update the service interval details</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Service Item */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Service Item
            </label>
            <input
              type="text"
              value={formData.service_item}
              onChange={(e) => setFormData({ ...formData, service_item: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
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
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}