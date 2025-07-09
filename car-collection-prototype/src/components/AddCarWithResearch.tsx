'use client';

import { useState } from 'react';
import { Car, CarCreate, ServiceResearchResponse, ServiceResearchResult, apiService } from '@/lib/api';
import CarForm from './CarForm';
import ServiceIntervalResearch from './ServiceIntervalResearch';
import ServiceIntervalReview from './ServiceIntervalReview';

interface AddCarWithResearchProps {
  onComplete: (car: Car) => void;
  onCancel: () => void;
}

type FlowStep = 'car-form' | 'research-prompt' | 'research-loading' | 'research-review' | 'complete';

export default function AddCarWithResearch({ onComplete, onCancel }: AddCarWithResearchProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('car-form');
  const [, setCarData] = useState<CarCreate | null>(null);
  const [createdCar, setCreatedCar] = useState<Car | null>(null);
  const [researchResult, setResearchResult] = useState<ServiceResearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCarSubmit = async (carFormData: CarCreate) => {
    try {
      setLoading(true);
      setError(null);
      
      // Create the car first
      const newCar = await apiService.createCar(carFormData);
      setCreatedCar(newCar);
      setCarData(carFormData);
      
      // Move to research prompt
      setCurrentStep('research-prompt');
    } catch (err: any) {
      setError(err.message || 'Failed to create car');
    } finally {
      setLoading(false);
    }
  };

  const handleResearchStart = async () => {
    if (!createdCar) return;
    
    try {
      setCurrentStep('research-loading');
      setError(null);
      
      // Research service intervals
      const research = await apiService.researchServiceIntervals(createdCar.id);
      setResearchResult(research);
      
      // Move to review step
      setCurrentStep('research-review');
    } catch (err: any) {
      setError(err.message || 'Failed to research service intervals');
      setCurrentStep('research-prompt');
    }
  };

  const handleResearchSkip = () => {
    if (createdCar) {
      onComplete(createdCar);
    }
  };

  const handleAcceptIntervals = async (intervals: ServiceResearchResult[]) => {
    if (!createdCar) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Convert research results to service interval creates
      const intervalCreates = intervals.map(interval => ({
        car_id: createdCar.id,
        service_item: interval.service_item,
        interval_miles: interval.interval_miles,
        interval_months: interval.interval_months,
        priority: interval.priority,
        cost_estimate_low: interval.cost_estimate_low,
        cost_estimate_high: interval.cost_estimate_high,
        notes: interval.notes,
        source: 'researched'
      }));
      
      // Create service intervals
      await apiService.createServiceIntervals(createdCar.id, intervalCreates);
      
      // Complete the flow
      setCurrentStep('complete');
      onComplete(createdCar);
    } catch (err: any) {
      setError(err.message || 'Failed to save service intervals');
    } finally {
      setLoading(false);
    }
  };

  const handleModifyIntervals = (intervals: ServiceResearchResult[]) => {
    // For now, just accept them - could add modify UI later
    handleAcceptIntervals(intervals);
  };

  const handleResearchCancel = () => {
    if (createdCar) {
      onComplete(createdCar);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'car-form':
        return (
          <CarForm
            onSubmit={handleCarSubmit}
            onCancel={onCancel}
            loading={loading}
          />
        );

      case 'research-prompt':
        return createdCar ? (
          <ServiceIntervalResearch
            car={createdCar}
            onResearch={handleResearchStart}
            onSkip={handleResearchSkip}
            isLoading={false}
          />
        ) : null;

      case 'research-loading':
        return (
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Researching Service Intervals
              </h3>
              <p className="text-slate-600">
                Searching for maintenance schedules for your {createdCar?.year} {createdCar?.make} {createdCar?.model}...
              </p>
            </div>
          </div>
        );

      case 'research-review':
        return researchResult ? (
          <ServiceIntervalReview
            researchResult={researchResult}
            onAccept={handleAcceptIntervals}
            onModify={handleModifyIntervals}
            onCancel={handleResearchCancel}
            isLoading={loading}
          />
        ) : null;

      case 'complete':
        return (
          <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Car Added Successfully!
              </h3>
              <p className="text-slate-600">
                Your {createdCar?.year} {createdCar?.make} {createdCar?.model} has been added to your collection.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-900">Add New Car</span>
          <span className="text-sm text-slate-500">
            {currentStep === 'car-form' ? 'Step 1 of 2' : 'Step 2 of 2'}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: currentStep === 'car-form' ? '50%' : '100%'
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Step Content */}
      {renderStep()}
    </div>
  );
}