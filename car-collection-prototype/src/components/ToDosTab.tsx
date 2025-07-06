import React, { useEffect, useState } from "react";
import { apiService, ToDo, ToDoCreate } from "../lib/api";

interface ToDosTabProps {
  carId: number;
}

const emptyForm: Omit<ToDoCreate, "car_id"> & { id?: number } = {
  title: "",
  description: "",
  due_date: "",
  priority: "medium",
};

export default function ToDosTab({ carId }: ToDosTabProps) {
  const [todos, setTodos] = useState<ToDo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchTodos = () => {
    setLoading(true);
    setError(null);
    apiService.getTodos(carId)
      .then(setTodos)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTodos();
    // eslint-disable-next-line
  }, [carId]);

  const openAddModal = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setModalOpen(true);
    setActionError(null);
  };

  const openEditModal = (todo: ToDo) => {
    setForm({
      id: todo.id,
      title: todo.title,
      description: todo.description || "",
      due_date: todo.due_date ? todo.due_date.slice(0, 10) : "",
      priority: todo.priority,
    });
    setEditingId(todo.id);
    setModalOpen(true);
    setActionError(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setForm({ ...emptyForm });
    setEditingId(null);
    setActionError(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      if (editingId) {
        await apiService.updateTodo(editingId, {
          title: form.title,
          description: form.description,
          due_date: form.due_date,
          priority: form.priority as 'low' | 'medium' | 'high',
        });
      } else {
        await apiService.createTodo({
          car_id: carId,
          title: form.title,
          description: form.description,
          due_date: form.due_date,
          priority: form.priority as 'low' | 'medium' | 'high',
        });
      }
      closeModal();
      fetchTodos();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this to-do?")) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.deleteTodo(id);
      fetchTodos();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleComplete = async (todo: ToDo) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await apiService.updateTodo(todo.id, { completed: !todo.completed });
      fetchTodos();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section id="tab-panel-todos" role="tabpanel" className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">To-Dos</h2>
      {loading ? (
        <div className="text-slate-500">Loading...</div>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : todos.length === 0 ? (
        <div className="text-slate-500">No to-dos found for this car.</div>
      ) : (
        <ul className="divide-y divide-slate-200">
          {todos.map((todo) => (
            <li key={todo.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <span className="font-medium text-slate-800">{todo.title}</span>
                {todo.due_date && (
                  <span className="ml-2 text-xs text-slate-500">Due: {new Date(todo.due_date).toLocaleDateString()}</span>
                )}
                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${todo.priority === 'high' ? 'bg-red-100 text-red-700' : todo.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{todo.priority}</span>
                <span className={`ml-2 text-xs px-2 py-1 rounded-full ${todo.completed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{todo.completed ? 'resolved' : 'open'}</span>
                {todo.description && <div className="text-xs text-slate-600 mt-1">{todo.description}</div>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <button className="text-xs text-blue-600 hover:underline" onClick={() => openEditModal(todo)}>Edit</button>
                <button className="text-xs text-red-600 hover:underline" onClick={() => handleDelete(todo.id)}>Delete</button>
                <button className="text-xs text-green-600 hover:underline" onClick={() => handleToggleComplete(todo)}>
                  {todo.completed ? "Reopen" : "Mark Complete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <button className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700" onClick={openAddModal}>+ Add To-Do</button>
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-slate-400 hover:text-slate-600" onClick={closeModal}>&times;</button>
            <h3 className="text-lg font-semibold mb-4">{editingId ? "Edit To-Do" : "Add To-Do"}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input name="title" value={form.title} onChange={handleFormChange} required className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input type="date" name="due_date" value={form.due_date} onChange={handleFormChange} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select name="priority" value={form.priority} onChange={handleFormChange} className="w-full border rounded px-2 py-1">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              {actionError && <div className="text-red-600 text-sm">{actionError}</div>}
              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700" disabled={actionLoading}>
                {actionLoading ? "Saving..." : editingId ? "Save Changes" : "Add To-Do"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
} 