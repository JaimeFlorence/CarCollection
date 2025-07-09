'use client';

import { useState, useEffect } from 'react';
import { Car, CarCreate, apiService } from '@/lib/api';
import CarCardEnhanced from '@/components/CarCardEnhanced';
import CarTableView from '@/components/CarTableView';
import CarForm from '@/components/CarForm';
import AddCarWithResearch from '@/components/AddCarWithResearch';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Header } from '@/components/Header';

type ViewMode = 'cards' | 'table';

export default function Dashboard() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  useEffect(() => {
    loadCars();
    
    // Load saved view mode from localStorage (client-side only)
    try {
      const savedViewMode = localStorage.getItem('car-dashboard-view-mode') as ViewMode;
      if (savedViewMode && (savedViewMode === 'cards' || savedViewMode === 'table')) {
        setViewMode(savedViewMode);
      }
    } catch (error) {
      // localStorage not available (SSR or restricted environment)
      console.warn('localStorage not available, using default view mode');
    }
  }, []);

  const loadCars = async () => {
    try {
      setLoading(true);
      const carsData = await apiService.getCars();
      setCars(carsData);
      setError(null);
    } catch (err: any) {
      if (err.message === 'Authentication required') {
        return;
      }
      setError('Failed to load cars. Make sure the backend server is running.');
      console.error('Error loading cars:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCar = async (carData: CarCreate) => {
    try {
      setFormLoading(true);
      await apiService.createCar(carData);
      await loadCars();
      setShowForm(false);
    } catch (err) {
      setError('Failed to add car');
      console.error('Error adding car:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditCar = async (carData: CarCreate) => {
    if (!editingCar) return;
    
    try {
      setFormLoading(true);
      await apiService.updateCar(editingCar.id, carData);
      await loadCars();
      setEditingCar(null);
      setShowForm(false);
    } catch (err) {
      setError('Failed to update car');
      console.error('Error updating car:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCar = async (id: number) => {
    if (!confirm('Are you sure you want to delete this car?')) return;
    
    try {
      await apiService.deleteCar(id);
      await loadCars();
    } catch (err) {
      setError('Failed to delete car');
      console.error('Error deleting car:', err);
    }
  };

  const openEditForm = (car: Car) => {
    setEditingCar(car);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingCar(null);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    
    // Save to localStorage (client-side only)
    try {
      localStorage.setItem('car-dashboard-view-mode', mode);
    } catch (error) {
      // localStorage not available or quota exceeded
      console.warn('Could not save view mode preference:', error);
    }
  };

  // Calculate collection statistics
  const totalCars = cars.length;
  const totalMileage = cars.reduce((sum, car) => sum + car.mileage, 0);
  const avgMileage = totalCars > 0 ? Math.round(totalMileage / totalCars) : 0;
  
  // Group statistics
  const carsByGroup = cars.reduce((acc, car) => {
    const group = car.group_name || 'Daily Drivers';
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <Header />
        
        <main className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-slate-600">Loading your collection...</p>
              </div>
            ) : (
              <>
                {/* Dashboard Header */}
                <div className="mb-8">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                      <h1 className="text-4xl font-bold text-slate-900 mb-2">
                        My Car Collection
                      </h1>
                      <p className="text-slate-600">
                        Manage and track your vehicles in one place
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* View Toggle */}
                      <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                        <button
                          onClick={() => handleViewModeChange('cards')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'cards'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          Cards
                        </button>
                        <button
                          onClick={() => handleViewModeChange('table')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'table'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                          </svg>
                          Table
                        </button>
                      </div>
                      
                      <button
                        onClick={() => setShowForm(true)}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Car
                      </button>
                    </div>
                  </div>

                  {/* Statistics Cards */}
                  {totalCars > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-100 p-3 rounded-lg">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Total Cars</p>
                            <p className="text-2xl font-bold text-slate-900">{totalCars}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 p-3 rounded-lg">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Total Mileage</p>
                            <p className="text-2xl font-bold text-slate-900">{totalMileage.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-3 rounded-lg">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Avg. Mileage</p>
                            <p className="text-2xl font-bold text-slate-900">{avgMileage.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-amber-100 p-3 rounded-lg">
                            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm text-slate-600">Groups</p>
                            <p className="text-2xl font-bold text-slate-900">{Object.keys(carsByGroup).length}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between">
                    <span>{error}</span>
                    <button
                      onClick={() => setError(null)}
                      className="text-red-500 hover:text-red-700 font-bold text-xl"
                    >
                      ×
                    </button>
                  </div>
                )}

                {cars.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="max-w-md mx-auto">
                      <svg className="w-24 h-24 text-slate-300 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                      </svg>
                      <h2 className="text-2xl font-semibold text-slate-800 mb-3">
                        Start Your Collection
                      </h2>
                      <p className="text-slate-600 mb-8">
                        Add your first car to begin tracking maintenance, tasks, and more.
                      </p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 inline-flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Your First Car
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {viewMode === 'cards' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cars.map((car) => (
                          <CarCardEnhanced
                            key={car.id}
                            car={car}
                            onEdit={openEditForm}
                            onDelete={handleDeleteCar}
                          />
                        ))}
                      </div>
                    ) : (
                      <CarTableView
                        cars={cars}
                        onEdit={openEditForm}
                        onDelete={handleDeleteCar}
                      />
                    )}
                  </div>
                )}

                {showForm && (
                  <>
                    {editingCar ? (
                      <CarForm
                        car={editingCar}
                        onSubmit={handleEditCar}
                        onCancel={closeForm}
                        loading={formLoading}
                      />
                    ) : (
                      <AddCarWithResearch
                        onComplete={(car) => {
                          loadCars();
                          setShowForm(false);
                        }}
                        onCancel={closeForm}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}