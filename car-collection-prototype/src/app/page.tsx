'use client';

import { useState, useEffect } from 'react';
import { Car, CarCreate, apiService } from '@/lib/api';
import CarCard from '@/components/CarCard';
import CarForm from '@/components/CarForm';

export default function Dashboard() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadCars();
  }, []);

  const loadCars = async () => {
    try {
      setLoading(true);
      const carsData = await apiService.getCars();
      setCars(carsData);
      setError(null);
    } catch (err) {
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center text-slate-800 drop-shadow-sm">
            🚗 Car Collection Dashboard
          </h1>
          <div className="text-center text-slate-600">Loading your cars...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-slate-800 drop-shadow-sm">
            🚗 Car Collection Dashboard
          </h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition"
          >
            + Add Car
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="float-right text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {cars.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🚗</div>
            <h2 className="text-2xl font-semibold text-slate-700 mb-2">
              No cars in your collection yet
            </h2>
            <p className="text-slate-600 mb-6">
              Start by adding your first car to track maintenance, issues, and more.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg shadow transition"
            >
              Add Your First Car
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {cars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onEdit={openEditForm}
                onDelete={handleDeleteCar}
              />
            ))}
          </div>
        )}

        {showForm && (
          <CarForm
            car={editingCar || undefined}
            onSubmit={editingCar ? handleEditCar : handleAddCar}
            onCancel={closeForm}
            loading={formLoading}
          />
        )}
      </div>
    </main>
  );
}
