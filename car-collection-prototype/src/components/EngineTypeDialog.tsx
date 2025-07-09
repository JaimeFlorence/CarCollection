'use client';

import { useState } from 'react';

interface EngineTypeDialogProps {
  make: string;
  model: string;
  year: number;
  onSelect: (engineType: string) => void;
  onCancel: () => void;
}

export default function EngineTypeDialog({
  make,
  model,
  year,
  onSelect,
  onCancel
}: EngineTypeDialogProps) {
  const [selectedType, setSelectedType] = useState<string>('');

  // Determine available engine types based on make/model
  const getEngineOptions = () => {
    const makeModel = `${make} ${model}`.toLowerCase();
    
    // Ford trucks
    if (makeModel.includes('f-250') || makeModel.includes('f250') ||
        makeModel.includes('f-350') || makeModel.includes('f350')) {
      return [
        { value: 'gas', label: 'Gas Engine (6.2L V8 or 7.3L V8)', description: 'Standard gasoline engine' },
        { value: 'diesel', label: 'Power Stroke Diesel (6.7L)', description: 'Turbo diesel with DEF system' }
      ];
    }
    
    // GM trucks
    if (makeModel.includes('silverado') || makeModel.includes('sierra')) {
      return [
        { value: 'gas', label: 'Gas Engine (5.3L, 6.2L V8)', description: 'Standard gasoline engine' },
        { value: 'diesel', label: 'Duramax Diesel (3.0L or 6.6L)', description: 'Turbo diesel engine' }
      ];
    }
    
    // European cars
    if (['bmw', 'mercedes', 'audi', 'volkswagen'].includes(make.toLowerCase())) {
      return [
        { value: 'gas', label: 'Gasoline Engine', description: 'Standard gas/petrol engine' },
        { value: 'diesel', label: 'TDI/CDI Diesel', description: 'Turbo diesel engine' }
      ];
    }
    
    // Toyota/Honda hybrids
    if ((make.toLowerCase() === 'toyota' && ['prius', 'camry', 'highlander', 'rav4'].some(m => model.toLowerCase().includes(m))) ||
        (make.toLowerCase() === 'honda' && ['accord', 'cr-v', 'insight'].some(m => model.toLowerCase().includes(m)))) {
      return [
        { value: 'gas', label: 'Gas Only', description: 'Standard gasoline engine' },
        { value: 'hybrid', label: 'Hybrid', description: 'Gas-electric hybrid system' }
      ];
    }
    
    // Default options
    return [
      { value: 'gas', label: 'Gasoline Engine', description: 'Standard gasoline engine' },
      { value: 'diesel', label: 'Diesel Engine', description: 'Diesel engine' },
      { value: 'hybrid', label: 'Hybrid', description: 'Gas-electric hybrid' },
      { value: 'electric', label: 'Electric', description: 'Battery electric vehicle' }
    ];
  };

  const engineOptions = getEngineOptions();

  const handleSubmit = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Select Engine Type</h2>
        
        <p className="text-gray-600 mb-6">
          Choose the engine type for your {year} {make} {model} to get accurate service intervals:
        </p>

        <div className="space-y-3 mb-6">
          {engineOptions.map((option) => (
            <label
              key={option.value}
              className={`
                block p-4 border rounded-lg cursor-pointer transition-colors
                ${selectedType === option.value 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            >
              <input
                type="radio"
                name="engineType"
                value={option.value}
                checked={selectedType === option.value}
                onChange={(e) => setSelectedType(e.target.value)}
                className="sr-only"
              />
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-sm text-gray-600 mt-1">{option.description}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!selectedType}
            className={`
              flex-1 py-2 px-4 rounded-lg font-medium transition-colors
              ${selectedType
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Get Service Intervals
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          Not sure? Check your owner's manual or look for badges on your vehicle.
        </div>
      </div>
    </div>
  );
}