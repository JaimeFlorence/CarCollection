'use client';

import { useState, useEffect } from 'react';
import { Car, ToDo, apiService } from '@/lib/api';
import ToDoForm from '@/components/ToDoForm';
import Link from 'next/link';

interface CarCardProps {
  car: Car;
  onEdit: (car: Car) => void;
  onDelete: (id: number) => void;
}

export default function CarCardEnhanced({ car, onEdit, onDelete }: CarCardProps) {
  const [todos, setTodos] = useState<ToDo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToDoForm, setShowToDoForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingToDo, setEditingToDo] = useState<ToDo | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    loadTodos();
  }, [car.id]);

  const loadTodos = async () => {
    try {
      const carTodos = await apiService.getTodos(car.id);
      setTodos(carTodos);
    } catch (error) {
      console.error('Failed to load todos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToDo = async (todoData: any) => {
    setFormLoading(true);
    try {
      await apiService.createTodo(todoData);
      await loadTodos();
      setShowToDoForm(false);
    } catch (error) {
      alert('Failed to add to-do');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditToDo = async (todoData: any) => {
    if (!editingToDo) return;
    setFormLoading(true);
    try {
      await apiService.updateTodo(editingToDo.id, todoData);
      await loadTodos();
      setEditingToDo(null);
      setShowToDoForm(false);
    } catch (error) {
      alert('Failed to update to-do');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditToDo = (todo: ToDo) => {
    setEditingToDo(todo);
    setShowToDoForm(true);
  };

  const openAddToDo = () => {
    setEditingToDo(null);
    setShowToDoForm(true);
  };

  const pendingTodos = todos.filter(todo => !todo.completed);
  const urgentTodos = pendingTodos.filter(todo => todo.priority === 'high');

  // Generate a placeholder image based on car details
  const getPlaceholderImage = () => {
    const colors = ['4F46E5', '7C3AED', 'DC2626', '059669', 'EA580C', '2563EB'];
    const colorIndex = (car.year + car.make.length) % colors.length;
    return `https://via.placeholder.com/400x250/${colors[colorIndex]}/FFFFFF?text=${encodeURIComponent(car.make + ' ' + car.model)}`;
  };

  // Get status badge styling
  const getStatusBadge = () => {
    if (urgentTodos.length > 0) {
      return {
        color: 'bg-red-500/10 text-red-700 border-red-200',
        icon: '🚨',
        text: `${urgentTodos.length} Urgent Task${urgentTodos.length > 1 ? 's' : ''}`
      };
    }
    if (pendingTodos.length > 0) {
      return {
        color: 'bg-amber-500/10 text-amber-700 border-amber-200',
        icon: '⚠️',
        text: `${pendingTodos.length} Task${pendingTodos.length > 1 ? 's' : ''} Pending`
      };
    }
    return {
      color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
      icon: '✅',
      text: 'All Tasks Complete'
    };
  };

  const status = getStatusBadge();

  return (
    <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-100">
      {/* Car Image Section */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300">
        <img 
          src={imageError ? getPlaceholderImage() : getPlaceholderImage()}
          alt={`${car.year} ${car.make} ${car.model}`}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Action Buttons - Appear on Hover */}
        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => onEdit(car)}
            className="bg-white/90 backdrop-blur-sm text-blue-600 hover:bg-white hover:text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg transition-all"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(car.id)}
            className="bg-white/90 backdrop-blur-sm text-red-600 hover:bg-white hover:text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg transition-all"
          >
            Delete
          </button>
        </div>

        {/* Car Name Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-xl drop-shadow-lg">
            {car.year} {car.make} {car.model}
          </h3>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5">
        {/* Mileage and License Plate */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-slate-400" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <span className="text-slate-600 font-medium">{(car.mileage || 0).toLocaleString()} mi</span>
            </div>
            {car.license_plate && (
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-slate-400" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
                <span className="text-slate-600 font-medium">{car.license_plate}</span>
              </div>
            )}
          </div>
          {car.insurance_info && (
            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Insured
            </span>
          )}
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${status.color} mb-4`}>
          <span>{status.icon}</span>
          <span>{status.text}</span>
        </div>

        {/* Notes */}
        {car.notes && (
          <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-sm text-slate-600 line-clamp-2">{car.notes}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link href={`/cars/${car.id}`} className="flex-1">
            <button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2">
              <span>View Details</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </Link>
          <button
            onClick={openAddToDo}
            className="bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Quick Stats Footer */}
      {!loading && todos.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>Total Tasks: {todos.length}</span>
            <span>Completed: {todos.filter(t => t.completed).length}</span>
          </div>
        </div>
      )}

      {showToDoForm && (
        <ToDoForm
          carId={car.id}
          todo={editingToDo || undefined}
          onSubmit={editingToDo ? handleEditToDo : handleAddToDo}
          onCancel={() => { setShowToDoForm(false); setEditingToDo(null); }}
          loading={formLoading}
        />
      )}
    </div>
  );
}