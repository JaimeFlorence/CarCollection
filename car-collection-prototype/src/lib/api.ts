const API_BASE_URL = 'http://localhost:8000';

export interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  mileage: number;
  license_plate?: string;
  insurance_info?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CarCreate {
  make: string;
  model: string;
  year: number;
  mileage: number;
  license_plate?: string;
  insurance_info?: string;
  notes?: string;
}

export interface ToDo {
  id: number;
  car_id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at?: string;
}

export interface ToDoCreate {
  car_id: number;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Car endpoints
  async getCars(): Promise<Car[]> {
    return this.request<Car[]>('/cars/');
  }

  async getCar(id: number): Promise<Car> {
    return this.request<Car>(`/cars/${id}`);
  }

  async createCar(car: CarCreate): Promise<Car> {
    return this.request<Car>('/cars/', {
      method: 'POST',
      body: JSON.stringify(car),
    });
  }

  async updateCar(id: number, car: Partial<CarCreate>): Promise<Car> {
    return this.request<Car>(`/cars/${id}`, {
      method: 'PUT',
      body: JSON.stringify(car),
    });
  }

  async deleteCar(id: number): Promise<void> {
    return this.request<void>(`/cars/${id}`, {
      method: 'DELETE',
    });
  }

  // ToDo endpoints
  async getTodos(carId?: number): Promise<ToDo[]> {
    if (!carId) return [];
    return this.request<ToDo[]>(`/cars/${carId}/todos/`);
  }

  async getTodo(id: number): Promise<ToDo> {
    return this.request<ToDo>(`/todos/${id}`);
  }

  async createTodo(todo: ToDoCreate): Promise<ToDo> {
    return this.request<ToDo>(`/cars/${todo.car_id}/todos/`, {
      method: 'POST',
      body: JSON.stringify({
        title: todo.title,
        description: todo.description,
        due_date: todo.due_date || null,
        priority: todo.priority,
      }),
    });
  }

  async updateTodo(id: number, todo: Partial<ToDoCreate> & { completed?: boolean }): Promise<ToDo> {
    return this.request<ToDo>(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(todo),
    });
  }

  async deleteTodo(id: number): Promise<void> {
    return this.request<void>(`/todos/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService(); 