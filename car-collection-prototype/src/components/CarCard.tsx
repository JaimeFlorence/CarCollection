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

export default function CarCard({ car, onEdit, onDelete }: CarCardProps) {
  const [todos, setTodos] = useState<ToDo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showToDoForm, setShowToDoForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editingToDo, setEditingToDo] = useState<ToDo | null>(null);

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

  const getStatusColor = () => {
    if (urgentTodos.length > 0) return 'bg-red-100 text-red-700';
    if (pendingTodos.length > 0) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getStatusText = () => {
    if (urgentTodos.length > 0) return `${urgentTodos.length} Urgent`;
    if (pendingTodos.length > 0) return `${pendingTodos.length} Pending`;
    return 'All Done';
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">
            {car.year} {car.make} {car.model}
          </h2>
          <p className="text-slate-600 mt-1">
            Mileage: {car.mileage.toLocaleString()} miles
          </p>
          {car.license_plate && (
            <p className="text-sm text-slate-500 mt-1">
              Plate: {car.license_plate}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(car)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(car.id)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className={`text-sm font-medium px-3 py-1 rounded-full ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        <div className="flex gap-2">
          {car.insurance_info && (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
              Insured
            </span>
          )}
          <button
            onClick={openAddToDo}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded px-2 py-1 ml-2"
          >
            + Add To-Do
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading todos...</div>
      ) : null}

      {car.notes && (
        <div className="mb-4 p-3 bg-slate-50 rounded-lg">
          <p className="text-sm text-slate-700">{car.notes}</p>
        </div>
      )}

      <Link href={`/cars/${car.id}`}>
        <button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg shadow transition">
          View Details
        </button>
      </Link>

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