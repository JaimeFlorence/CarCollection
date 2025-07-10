'use client';

import { useState, useEffect } from 'react';
import { ServiceHistory, ServiceInterval, apiService } from '@/lib/api';
import { format } from 'date-fns';

interface ServiceEntryDialogProps {
  carId: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (serviceData: Partial<ServiceHistory>, selectedIntervalIds?: number[], intervalCosts?: Array<{intervalId: number, cost: number}>) => Promise<void>;
  existingService?: ServiceHistory;
  preselectedInterval?: ServiceInterval | null;
}

export default function ServiceEntryDialog({
  carId,
  isOpen,
  onClose,
  onSave,
  existingService,
  preselectedInterval
}: ServiceEntryDialogProps) {
  const [formData, setFormData] = useState({
    performed_date: existingService?.performed_date 
      ? format(new Date(existingService.performed_date), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
    mileage: existingService?.mileage?.toString() || '',
    shop: existingService?.shop || '',
    invoice_number: existingService?.invoice_number || '',
    service_item: existingService?.service_item || '',
    cost: existingService?.cost?.toString() || '',
    notes: existingService?.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serviceIntervals, setServiceIntervals] = useState<ServiceInterval[]>([]);
  const [selectedIntervals, setSelectedIntervals] = useState<number[]>([]);
  const [intervalCosts, setIntervalCosts] = useState<Record<number, string>>({});
  const [loadingIntervals, setLoadingIntervals] = useState(false);

  // Update form data when existingService changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      // If we have a preselected interval and no existing service, pre-populate from the interval
      const shouldUseInterval = preselectedInterval && !existingService;
      
      setFormData({
        performed_date: existingService?.performed_date 
          ? format(new Date(existingService.performed_date), 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd'),
        mileage: existingService?.mileage?.toString() || '',
        shop: existingService?.shop || '',
        invoice_number: existingService?.invoice_number || '',
        service_item: existingService?.service_item || (shouldUseInterval ? preselectedInterval.service_item : ''),
        cost: existingService?.cost?.toString() || (shouldUseInterval 
          ? (((preselectedInterval.cost_estimate_low || 0) + (preselectedInterval.cost_estimate_high || 0)) / 2).toString()
          : ''),
        notes: existingService?.notes || ''
      });
      setErrors({});
      
      // If we have a preselected interval, mark it as selected
      setSelectedIntervals(preselectedInterval && !existingService ? [preselectedInterval.id] : []);
      setIntervalCosts({}); // Reset interval costs
      
      // Load service intervals for this car
      loadServiceIntervals();
    }
  }, [isOpen, existingService, preselectedInterval]);

  const loadServiceIntervals = async () => {
    setLoadingIntervals(true);
    try {
      const intervals = await apiService.getServiceIntervals(carId);
      setServiceIntervals(intervals);
    } catch (error) {
      console.error('Failed to load service intervals:', error);
    } finally {
      setLoadingIntervals(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.performed_date) {
      newErrors.performed_date = 'Service date is required';
    }
    
    if (!formData.service_item.trim()) {
      newErrors.service_item = 'Service description is required';
    }
    
    if (formData.mileage && isNaN(Number(formData.mileage))) {
      newErrors.mileage = 'Mileage must be a number';
    }
    
    if (formData.cost && isNaN(Number(formData.cost))) {
      newErrors.cost = 'Cost must be a number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const serviceData: Partial<ServiceHistory> = {
        performed_date: new Date(formData.performed_date).toISOString(),
        service_item: formData.service_item.trim(),
        mileage: formData.mileage ? Number(formData.mileage) : undefined,
        cost: formData.cost ? Number(formData.cost) : undefined,
        shop: formData.shop.trim() || undefined,
        invoice_number: formData.invoice_number.trim() || undefined,
        notes: formData.notes.trim() || undefined
      };
      
      // Pass the interval costs along with the selected intervals
      const intervalCostData = selectedIntervals.map(id => ({
        intervalId: id,
        cost: parseFloat(intervalCosts[id] || '0')
      }));
      
      await onSave(serviceData, selectedIntervals, intervalCostData);
      onClose();
    } catch (error: any) {
      console.error('Failed to save service:', error);
      const errorMessage = error.message || 'Failed to save service record. Please try again.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleIntervalToggle = (intervalId: number) => {
    setSelectedIntervals(prev => {
      const newSelected = prev.includes(intervalId) 
        ? prev.filter(id => id !== intervalId)
        : [...prev, intervalId];
      
      // If unchecking, remove the cost
      if (!newSelected.includes(intervalId)) {
        setIntervalCosts(prev => {
          const newCosts = { ...prev };
          delete newCosts[intervalId];
          return newCosts;
        });
      }
      
      return newSelected;
    });
  };

  const handleIntervalCostChange = (intervalId: number, cost: string) => {
    setIntervalCosts(prev => ({
      ...prev,
      [intervalId]: cost
    }));
  };

  // Calculate the sum of individual interval costs
  const calculateIntervalCostsSum = () => {
    return Object.entries(intervalCosts)
      .filter(([id]) => selectedIntervals.includes(Number(id)))
      .reduce((sum, [_, cost]) => sum + (parseFloat(cost) || 0), 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              {existingService ? 'Edit Service Record' : 'Add Service Record'}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="service-date" className="block text-sm font-medium text-slate-700 mb-1">
                  Service Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="service-date"
                  type="date"
                  value={formData.performed_date}
                  onChange={(e) => handleChange('performed_date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.performed_date ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {errors.performed_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.performed_date}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="mileage" className="block text-sm font-medium text-slate-700 mb-1">
                  Mileage
                </label>
                <input
                  id="mileage"
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => handleChange('mileage', e.target.value)}
                  placeholder="e.g., 50000"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.mileage ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {errors.mileage && (
                  <p className="mt-1 text-sm text-red-600">{errors.mileage}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="shop" className="block text-sm font-medium text-slate-700 mb-1">
                  Shop/Provider
                </label>
                <input
                  id="shop"
                  type="text"
                  value={formData.shop}
                  onChange={(e) => handleChange('shop', e.target.value)}
                  placeholder="e.g., Joe's Garage"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="invoice-number" className="block text-sm font-medium text-slate-700 mb-1">
                  Invoice #
                </label>
                <input
                  id="invoice-number"
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => handleChange('invoice_number', e.target.value)}
                  placeholder="e.g., INV-12345"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-900">Service Details</h3>
            
            <div>
              <label htmlFor="service-description" className="block text-sm font-medium text-slate-700 mb-1">
                Service Description <span className="text-red-500">*</span>
              </label>
              <input
                id="service-description"
                type="text"
                value={formData.service_item}
                onChange={(e) => handleChange('service_item', e.target.value)}
                placeholder="e.g., Oil Change, Tire Rotation"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.service_item ? 'border-red-300' : 'border-slate-300'
                }`}
              />
              {errors.service_item && (
                <p className="mt-1 text-sm text-red-600">{errors.service_item}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="cost" className="block text-sm font-medium text-slate-700 mb-1">
                Total Cost
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => handleChange('cost', e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.cost ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
              </div>
              {errors.cost && (
                <p className="mt-1 text-sm text-red-600">{errors.cost}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Additional notes about the service..."
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Service Schedule Items */}
          {serviceIntervals.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-slate-900">Service Schedule Items</h3>
              <p className="text-sm text-slate-600">
                Select any scheduled services that were completed during this visit:
              </p>
              
              {loadingIntervals ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-lg p-4">
                  {serviceIntervals.map((interval) => (
                    <div
                      key={interval.id}
                      className={`p-3 rounded-lg transition-colors ${
                        selectedIntervals.includes(interval.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedIntervals.includes(interval.id)}
                          onChange={() => handleIntervalToggle(interval.id)}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-slate-900">{interval.service_item}</div>
                          <div className="text-sm text-slate-600">
                            Every {interval.interval_miles?.toLocaleString()} miles or {interval.interval_months} months
                          </div>
                          {(interval.cost_estimate_low || interval.cost_estimate_high) && (
                            <div className="text-sm text-slate-500">
                              Est. cost: ${interval.cost_estimate_low} - ${interval.cost_estimate_high}
                            </div>
                          )}
                        </div>
                      </label>
                      {selectedIntervals.includes(interval.id) && (
                        <div className="mt-3 ml-7">
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Cost for this service
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={intervalCosts[interval.id] || ''}
                              onChange={(e) => handleIntervalCostChange(interval.id, e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedIntervals.length > 0 && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Sum of service items:</span>
                    <span className="font-medium">${calculateIntervalCostsSum().toFixed(2)}</span>
                  </div>
                  {formData.cost && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-slate-600">Invoice total:</span>
                      <span className="font-medium">${parseFloat(formData.cost).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {existingService ? 'Update Service' : 'Add Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}