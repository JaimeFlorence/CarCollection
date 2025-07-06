const API_BASE_URL = 'http://localhost:8000';

// User and Authentication Interfaces
export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserCreate {
  username: string;
  email: string;
  password: string;
}

export interface UserCreateByAdmin {
  username: string;
  email: string;
  password: string;
  is_admin: boolean;
  send_invitation: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Updated Car interface with user_id
export interface Car {
  id: number;
  user_id: number;
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

// Updated ToDo interface with user_id
export interface ToDo {
  id: number;
  user_id: number;
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
  private token: string | null = null;

  // Token management
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers as Record<string, string>,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      headers,
      ...options,
    });

    if (response.status === 401) {
      // Token expired or invalid
      this.setToken(null);
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Authentication endpoints
  async login(credentials: UserLogin): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.setToken(response.access_token);
    return response;
  }

  async register(user: UserCreate): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // Admin endpoints
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/admin/users/');
  }

  async createUserByAdmin(user: UserCreateByAdmin): Promise<User> {
    return this.request<User>('/admin/users/', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  }

  // Car endpoints (now require authentication)
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

  // ToDo endpoints (now require authentication)
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