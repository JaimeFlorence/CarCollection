'use client';

import { useState, useEffect } from 'react';
import { Car, ToDo, apiService } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface CarTableViewProps {
  cars: Car[];
  onEdit: (car: Car) => void;
  onDelete: (id: number) => void;
}

interface CarWithTodos extends Car {
  todos: ToDo[];
  todoCount: number;
  urgentTodos: number;
}

export default function CarTableView({ cars, onEdit, onDelete }: CarTableViewProps) {
  const router = useRouter();
  const [carsWithTodos, setCarsWithTodos] = useState<CarWithTodos[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof CarWithTodos>('year');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [groups, setGroups] = useState<string[]>([]);

  useEffect(() => {
    loadCarData();
    loadGroups();
  }, [cars]);

  const loadCarData = async () => {
    setLoading(true);
    const carsData = await Promise.all(
      cars.map(async (car) => {
        try {
          const todos = await apiService.getTodos(car.id);
          const pendingTodos = todos.filter(todo => !todo.completed);
          const urgentTodos = pendingTodos.filter(todo => todo.priority === 'high');
          
          return {
            ...car,
            todos,
            todoCount: pendingTodos.length,
            urgentTodos: urgentTodos.length,
          };
        } catch (error) {
          console.error(`Failed to load todos for car ${car.id}:`, error);
          return {
            ...car,
            todos: [],
            todoCount: 0,
            urgentTodos: 0,
          };
        }
      })
    );
    setCarsWithTodos(carsData);
    setLoading(false);
  };

  const loadGroups = async () => {
    try {
      const groupsData = await apiService.getCarGroups();
      setGroups(groupsData);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const handleSort = (field: keyof CarWithTodos) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof CarWithTodos) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getStatusBadge = (car: CarWithTodos) => {
    if (car.urgentTodos > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
          {car.urgentTodos} Urgent
        </span>
      );
    }
    if (car.todoCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
          {car.todoCount} Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        Complete
      </span>
    );
  };

  const getGroupBadge = (groupName: string | undefined) => {
    if (!groupName) return null;
    
    const colors = {
      'Daily Drivers': 'bg-blue-100 text-blue-800',
      'Collector Cars': 'bg-purple-100 text-purple-800',
      'Project Cars': 'bg-orange-100 text-orange-800',
      'Racing Cars': 'bg-red-100 text-red-800',
      'Classic Cars': 'bg-emerald-100 text-emerald-800',
    };
    
    const colorClass = colors[groupName as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {groupName}
      </span>
    );
  };

  // Filter and sort cars
  const filteredAndSortedCars = carsWithTodos
    .filter(car => {
      if (filterGroup === 'all') return true;
      return car.group_name === filterGroup;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const handleRowClick = (car: CarWithTodos, event: React.MouseEvent) => {
    // Don't navigate if user clicked on a button or link
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button') || target.closest('a')) {
      return;
    }
    
    router.push(`/cars/${car.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Table Header with Filters */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Cars by Group</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700">Filter by Group:</label>
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Groups</option>
                {groups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-slate-600">
              {filteredAndSortedCars.length} of {carsWithTodos.length} cars
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-700">
                <button
                  onClick={() => handleSort('year')}
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  Vehicle
                  {getSortIcon('year')}
                </button>
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-700">
                <button
                  onClick={() => handleSort('group_name')}
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  Group
                  {getSortIcon('group_name')}
                </button>
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-700">
                <button
                  onClick={() => handleSort('mileage')}
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  Mileage
                  {getSortIcon('mileage')}
                </button>
              </th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-700">License Plate</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-slate-700">
                <button
                  onClick={() => handleSort('todoCount')}
                  className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                >
                  Status
                  {getSortIcon('todoCount')}
                </button>
              </th>
              <th className="text-right px-6 py-4 text-sm font-medium text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredAndSortedCars.map((car) => (
              <tr 
                key={car.id} 
                className="hover:bg-blue-50 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                onClick={(event) => handleRowClick(car, event)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                        {car.year} {car.make} {car.model}
                      </div>
                      {car.notes && (
                        <div className="text-sm text-slate-500 max-w-xs truncate">
                          {car.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getGroupBadge(car.group_name)}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-900 font-medium">
                    {car.mileage?.toLocaleString() || 'N/A'} miles
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-900">
                    {car.license_plate || 'N/A'}
                  </div>
                  {car.insurance_info && (
                    <div className="text-xs text-green-600 mt-1">Insured</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(car)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link href={`/cars/${car.id}`}>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors relative z-10">
                        View
                      </button>
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(car);
                      }}
                      className="text-slate-600 hover:text-slate-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors relative z-10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(car.id);
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition-colors relative z-10"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedCars.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-500">No cars found in the selected group.</p>
        </div>
      )}
    </div>
  );
}