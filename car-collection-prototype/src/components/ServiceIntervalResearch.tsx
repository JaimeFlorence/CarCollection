'use client';

import { useState } from 'react';
import { Car } from '@/lib/api';

interface ServiceIntervalResearchProps {
  car: Car;
  onResearch: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

export default function ServiceIntervalResearch({
  car,
  onResearch,
  onSkip,
  isLoading = false
}: ServiceIntervalResearchProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            Research Maintenance Intervals?
          </h3>
          <p className="text-slate-600 mb-4">
            We can research maintenance schedules for your <span className="font-medium text-slate-900">{car.year} {car.make} {car.model}</span> from manufacturer websites and automotive databases.
          </p>
          
          {showDetails && (
            <div className="bg-white rounded-lg p-4 mb-4 border border-blue-100">
              <h4 className="font-medium text-slate-900 mb-2">What we'll research:</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Oil change intervals</li>
                <li>• Tire rotation schedules</li>
                <li>• Filter replacements</li>
                <li>• Brake fluid service</li>
                <li>• Other routine maintenance</li>
              </ul>
              <p className="text-xs text-slate-500 mt-3">
                Sources: Manufacturer websites, automotive databases, and maintenance guides
              </p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onResearch}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Researching...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Research Now
                </>
              )}
            </button>
            
            <button
              onClick={onSkip}
              disabled={isLoading}
              className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-lg border border-slate-300 transition-colors"
            >
              I&apos;ll Add My Own
            </button>
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="px-4 py-3 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
            >
              {showDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}