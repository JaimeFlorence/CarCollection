'use client';

import { useState } from 'react';
import { ServiceResearchResponse, ServiceResearchResult } from '@/lib/api';

interface ServiceIntervalReviewProps {
  researchResult: ServiceResearchResponse;
  onAccept: (intervals: ServiceResearchResult[]) => void;
  onModify: (intervals: ServiceResearchResult[]) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ServiceIntervalReview({
  researchResult,
  onAccept,
  onModify,
  onCancel,
  isLoading = false
}: ServiceIntervalReviewProps) {
  const [selectedIntervals, setSelectedIntervals] = useState<ServiceResearchResult[]>(
    researchResult.suggested_intervals
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatInterval = (interval: ServiceResearchResult) => {
    const parts = [];
    if (interval.interval_miles) {
      parts.push(`${interval.interval_miles.toLocaleString()} miles`);
    }
    if (interval.interval_months) {
      parts.push(`${interval.interval_months} months`);
    }
    return parts.join(' or ');
  };

  const formatCost = (interval: ServiceResearchResult) => {
    if (interval.cost_estimate_low && interval.cost_estimate_high) {
      const low = Number(interval.cost_estimate_low);
      const high = Number(interval.cost_estimate_high);
      return `$${low.toFixed(0)} - $${high.toFixed(0)}`;
    }
    return 'Cost varies';
  };

  const toggleInterval = (interval: ServiceResearchResult) => {
    setSelectedIntervals(prev =>
      prev.find(i => i.service_item === interval.service_item)
        ? prev.filter(i => i.service_item !== interval.service_item)
        : [...prev, interval]
    );
  };

  const isSelected = (interval: ServiceResearchResult) => {
    return selectedIntervals.some(i => i.service_item === interval.service_item);
  };

  if (researchResult.suggested_intervals.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="text-center py-8">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No Service Intervals Found
          </h3>
          <p className="text-slate-600 mb-6">
            We couldn't find specific maintenance intervals for your {researchResult.year} {researchResult.make} {researchResult.model}.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Add Intervals Manually
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Service Intervals Found
            </h3>
            <p className="text-slate-600">
              Found {researchResult.total_intervals_found} intervals for your {researchResult.year} {researchResult.make} {researchResult.model}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Sources</p>
            <p className="text-sm text-slate-900">{researchResult.sources_checked.join(', ')}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {researchResult.suggested_intervals.map((interval, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              isSelected(interval)
                ? 'border-blue-200 bg-blue-50 shadow-sm'
                : 'border-slate-200 hover:border-slate-300'
            }`}
            onClick={() => toggleInterval(interval)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <input
                    type="checkbox"
                    checked={isSelected(interval)}
                    onChange={() => toggleInterval(interval)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 mb-1">
                    {interval.service_item}
                  </h4>
                  <p className="text-sm text-slate-600 mb-2">
                    Every {formatInterval(interval)}
                  </p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(interval.priority)}`}>
                      {interval.priority} priority
                    </span>
                    <span className="text-slate-600">
                      {formatCost(interval)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Confidence</p>
                <p className={`text-sm font-medium ${getConfidenceColor(interval.confidence_score)}`}>
                  {interval.confidence_score}/10
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {interval.source}
                </p>
              </div>
            </div>
            {interval.notes && (
              <p className="text-sm text-slate-600 mt-2 ml-7">
                {interval.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="p-6 border-t border-slate-200 bg-slate-50">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-600">
            {selectedIntervals.length} of {researchResult.suggested_intervals.length} intervals selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onModify(selectedIntervals)}
              disabled={isLoading}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
            >
              Modify Selected
            </button>
            <button
              onClick={() => onAccept(selectedIntervals)}
              disabled={isLoading || selectedIntervals.length === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
            >
              {isLoading ? 'Saving...' : `Accept ${selectedIntervals.length} Intervals`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}