'use client';

import { useState, useEffect } from 'react';
import { Car, CarCreate, apiService } from '@/lib/api';

interface CarFormProps {
  car?: Car;
  onSubmit: (carData: CarCreate) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function CarForm({ car, onSubmit, onCancel, loading = false }: CarFormProps) {
  const [formData, setFormData] = useState<CarCreate>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    mileage: 0,
    license_plate: '',
    insurance_info: '',
    notes: '',
    group_name: 'Daily Drivers',
  });
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    loadGroups();
    if (car) {
      setFormData({
        make: car.make,
        model: car.model,
        year: car.year,
        mileage: car.mileage,
        license_plate: car.license_plate || '',
        insurance_info: car.insurance_info || '',
        notes: car.notes || '',
        group_name: car.group_name || 'Daily Drivers',
      });
    }
  }, [car]);

  const loadGroups = async () => {
    try {
      const groups = await apiService.getCarGroups();
      setAvailableGroups(groups);
    } catch (error) {
      console.error('Failed to load groups:', error);
      setAvailableGroups(['Daily Drivers', 'Collector Cars']);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' || name === 'mileage' ? parseInt(value) || 0 : value,
    }));
  };

  const handleGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'new') {
      setShowNewGroupInput(true);
    } else {
      setFormData(prev => ({ ...prev, group_name: value }));
      setShowNewGroupInput(false);
    }
  };

  const handleNewGroupSubmit = () => {
    if (newGroupName.trim()) {
      setFormData(prev => ({ ...prev, group_name: newGroupName.trim() }));
      setShowNewGroupInput(false);
      setNewGroupName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">
          {car ? 'Edit Car' : 'Add New Car'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Make *
              </label>
              <input
                type="text"
                name="make"
                value={formData.make}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Toyota"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Model *
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Camry"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Year *
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                required
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mileage *
              </label>
              <input
                type="number"
                name="mileage"
                value={formData.mileage}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              License Plate
            </label>
            <input
              type="text"
              name="license_plate"
              value={formData.license_plate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ABC123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Insurance Info
            </label>
            <input
              type="text"
              name="insurance_info"
              value={formData.insurance_info}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Policy #12345"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Group
            </label>
            {showNewGroupInput ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter new group name"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleNewGroupSubmit}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewGroupInput(false); setNewGroupName(''); }}
                  className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <select
                name="group_name"
                value={formData.group_name}
                onChange={handleGroupChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableGroups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
                <option value="new">+ Create New Group</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional notes about the car..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Saving...' : (car ? 'Update Car' : 'Add Car')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 