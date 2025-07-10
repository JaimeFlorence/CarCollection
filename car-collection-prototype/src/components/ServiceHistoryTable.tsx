'use client';

import { useState, useEffect } from 'react';
import { ServiceHistory } from '@/lib/api';
import { format } from 'date-fns';

interface ServiceHistoryTableProps {
  carId: number;
  serviceHistory: ServiceHistory[];
  loading?: boolean;
  onEdit?: (service: ServiceHistory) => void;
  onDelete?: (service: ServiceHistory) => void;
}

interface GroupedService {
  date: string;
  mileage: number | null;
  shop: string | null;
  items: ServiceHistory[];
  totalCost: number;
}

export default function ServiceHistoryTable({ 
  carId: _carId, // Not currently used but might be needed for future features
  serviceHistory,
  loading = false,
  onEdit,
  onDelete
}: ServiceHistoryTableProps) {
  const [groupedServices, setGroupedServices] = useState<GroupedService[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'mileage' | 'cost'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Group services by date
  useEffect(() => {
    const grouped = serviceHistory.reduce((acc, service) => {
      const dateKey = format(new Date(service.performed_date), 'yyyy-MM-dd');
      
      let group = acc.find(g => g.date === dateKey);
      if (!group) {
        group = {
          date: dateKey,
          mileage: service.mileage || null,
          shop: service.shop || null,
          items: [],
          totalCost: 0
        };
        acc.push(group);
      }
      
      group.items.push(service);
      group.totalCost += Number(service.cost) || 0;
      
      // Use the highest mileage for the group
      if (service.mileage && (!group.mileage || service.mileage > group.mileage)) {
        group.mileage = service.mileage;
      }
      
      // Use the first shop name if multiple
      if (service.shop && !group.shop) {
        group.shop = service.shop;
      }
      
      return acc;
    }, [] as GroupedService[]);

    // Sort the grouped services
    const sorted = [...grouped].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'mileage':
          comparison = (a.mileage || 0) - (b.mileage || 0);
          break;
        case 'cost':
          comparison = a.totalCost - b.totalCost;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setGroupedServices(sorted);
  }, [serviceHistory, sortBy, sortOrder]);

  // Calculate summary statistics
  const totalServices = groupedServices.length;
  const totalCost = groupedServices.reduce((sum, group) => sum + (Number(group.totalCost) || 0), 0);
  const averageCost = totalServices > 0 ? totalCost / totalServices : 0;
  const lastService = groupedServices.length > 0 ? groupedServices[0] : null;
  const daysSinceLastService = lastService 
    ? Math.floor((new Date().getTime() - new Date(lastService.date).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleSort = (column: 'date' | 'mileage' | 'cost') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading service history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">📊 Service Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-slate-600">Total Services</p>
            <p className="text-2xl font-bold text-slate-900">{totalServices}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Total Spent</p>
            <p className="text-2xl font-bold text-slate-900">${Number(totalCost).toFixed(0)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Average Cost</p>
            <p className="text-2xl font-bold text-slate-900">${Number(averageCost).toFixed(0)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Last Service</p>
            <p className="text-2xl font-bold text-slate-900">
              {daysSinceLastService !== null ? `${daysSinceLastService} days ago` : 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Service History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th 
                  className="text-left px-6 py-4 text-sm font-medium text-slate-900 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Date
                    {sortBy === 'date' && (
                      <span className="text-blue-600">
                        {sortOrder === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </div>
                </th>
                <th 
                  className="text-left px-6 py-4 text-sm font-medium text-slate-900 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('mileage')}
                >
                  <div className="flex items-center gap-2">
                    Mileage
                    {sortBy === 'mileage' && (
                      <span className="text-blue-600">
                        {sortOrder === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </div>
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-900">
                  Shop
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-slate-900">
                  Summary
                </th>
                <th 
                  className="text-right px-6 py-4 text-sm font-medium text-slate-900 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('cost')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Cost
                    {sortBy === 'cost' && (
                      <span className="text-blue-600">
                        {sortOrder === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {groupedServices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No service history recorded yet
                  </td>
                </tr>
              ) : (
                groupedServices.map((group, index) => (
                  <tr 
                    key={`${group.date}-${index}`}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {format(new Date(group.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {group.mileage ? group.mileage.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {group.shop || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {group.items.map((item, idx) => (
                          <div key={item.id} className="flex items-center justify-between gap-2">
                            <span className="text-sm text-slate-900">{item.service_item}</span>
                            <div className="flex items-center gap-1">
                              {onEdit && (
                                <button
                                  onClick={() => onEdit(item)}
                                  className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                  title="Edit service record"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  onClick={() => onDelete(item)}
                                  className="text-red-600 hover:text-red-800 transition-colors p-1"
                                  title="Delete service record"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 text-right">
                      <div className="space-y-1">
                        <div className="font-medium">${Number(group.totalCost).toFixed(2)}</div>
                        {/* Show breakdown if any item has parts/labor/tax */}
                        {group.items.some(item => item.parts_cost || item.labor_cost || item.tax) && (
                          <div className="text-xs text-slate-500 space-y-0.5">
                            {(() => {
                              const totals = group.items.reduce((acc, item) => ({
                                parts: acc.parts + (Number(item.parts_cost) || 0),
                                labor: acc.labor + (Number(item.labor_cost) || 0),
                                tax: acc.tax + (Number(item.tax) || 0)
                              }), { parts: 0, labor: 0, tax: 0 });
                              
                              return (
                                <>
                                  {totals.parts > 0 && <div>Parts: ${totals.parts.toFixed(2)}</div>}
                                  {totals.labor > 0 && <div>Labor: ${totals.labor.toFixed(2)}</div>}
                                  {totals.tax > 0 && <div>Tax: ${totals.tax.toFixed(2)}</div>}
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}