'use client';

import { useState, useEffect } from 'react';
import { ToDo, ToDoCreate } from '@/lib/api';

interface ToDoFormProps {
  carId: number;
  todo?: Partial<ToDo>;
  onSubmit: (todo: ToDoCreate | Partial<ToDo>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ToDoForm({ carId, todo, onSubmit, onCancel, loading = false }: ToDoFormProps) {
  const [formData, setFormData] = useState<ToDoCreate>({
    car_id: carId,
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
  });

  useEffect(() => {
    if (todo) {
      setFormData({
        car_id: carId,
        title: todo.title || '',
        description: todo.description || '',
        due_date: todo.due_date ? new Date(todo.due_date).toISOString().slice(0, 10) : '',
        priority: todo.priority || 'medium',
      });
    }
  }, [todo, carId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let todoData = { ...formData };
    if (todoData.due_date) {
      todoData.due_date = new Date(todoData.due_date + 'T00:00:00').toISOString();
    } else {
      todoData.due_date = undefined;
    }
    onSubmit(todoData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">Add To-Do</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Oil Change"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Details about this to-do..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Saving...' : 'Add To-Do'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 