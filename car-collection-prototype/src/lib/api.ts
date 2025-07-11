const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
  vin?: string;
  mileage: number;
  license_plate?: string;
  insurance_info?: string;
  notes?: string;
  group_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CarCreate {
  make: string;
  model: string;
  year: number;
  vin?: string;
  mileage: number;
  license_plate?: string;
  insurance_info?: string;
  notes?: string;
  group_name?: string;
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

// Service Interval Interfaces
export interface ServiceInterval {
  id: number;
  user_id: number;
  car_id: number;
  service_item: string;
  interval_miles?: number;
  interval_months?: number;
  priority: 'low' | 'medium' | 'high';
  cost_estimate_low?: number;
  cost_estimate_high?: number;
  notes?: string;
  source?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceIntervalCreate {
  car_id: number;
  service_item: string;
  interval_miles?: number;
  interval_months?: number;
  priority?: 'low' | 'medium' | 'high';
  cost_estimate_low?: number;
  cost_estimate_high?: number;
  notes?: string;
  source?: string;
}

export interface ServiceResearchResult {
  service_item: string;
  interval_miles?: number;
  interval_months?: number;
  priority: 'low' | 'medium' | 'high';
  cost_estimate_low?: number;
  cost_estimate_high?: number;
  source: string;
  confidence_score: number;
  notes?: string;
}

export interface ServiceResearchResponse {
  car_id: number;
  make: string;
  model: string;
  year: number;
  suggested_intervals: ServiceResearchResult[];
  sources_checked: string[];
  total_intervals_found: number;
  research_date: string;
}

export interface ServiceHistory {
  id: number;
  user_id: number;
  car_id: number;
  service_item: string;
  performed_date: string;
  mileage?: number;
  cost?: number;
  parts_cost?: number;  // New field for parts breakdown
  labor_cost?: number;  // New field for labor breakdown
  tax?: number;  // New field for tax
  shop?: string;  // New field
  invoice_number?: string;  // New field
  notes?: string;
  next_due_date?: string;
  next_due_mileage?: number;
  created_at: string;
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

    // Handle 204 No Content responses (e.g., from DELETE operations)
    if (response.status === 204) {
      return null as T;
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

  async refreshToken(): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/refresh', {
      method: 'POST',
    });
    this.setToken(response.access_token);
    return response;
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

  async updateUser(userId: number, userUpdate: Partial<User>): Promise<User> {
    return this.request<User>(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userUpdate),
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

  // Group endpoints
  async getCarGroups(): Promise<string[]> {
    return this.request<string[]>('/cars/groups/');
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
        car_id: todo.car_id,
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

  // Service Interval endpoints
  async researchServiceIntervals(carId: number, engineType?: string): Promise<ServiceResearchResponse> {
    const url = engineType 
      ? `/api/cars/${carId}/research-intervals?engine_type=${engineType}`
      : `/api/cars/${carId}/research-intervals`;
    
    return this.request<ServiceResearchResponse>(url, {
      method: 'POST',
    });
  }

  async getServiceIntervals(carId: number): Promise<ServiceInterval[]> {
    return this.request<ServiceInterval[]>(`/api/cars/${carId}/service-intervals`);
  }

  async createServiceIntervals(carId: number, intervals: ServiceIntervalCreate[]): Promise<ServiceInterval[]> {
    return this.request<ServiceInterval[]>(`/api/cars/${carId}/service-intervals/bulk`, {
      method: 'POST',
      body: JSON.stringify(intervals),
    });
  }
  
  async createServiceInterval(carId: number, interval: ServiceIntervalCreate): Promise<ServiceInterval> {
    return this.request<ServiceInterval>(`/api/cars/${carId}/service-intervals`, {
      method: 'POST',
      body: JSON.stringify(interval),
    });
  }

  async updateServiceInterval(intervalId: number, interval: Partial<ServiceIntervalCreate>): Promise<ServiceInterval> {
    return this.request<ServiceInterval>(`/api/service-intervals/${intervalId}`, {
      method: 'PUT',
      body: JSON.stringify(interval),
    });
  }

  async deleteServiceInterval(intervalId: number): Promise<void> {
    return this.request<void>(`/api/service-intervals/${intervalId}`, {
      method: 'DELETE',
    });
  }

  async getServiceHistory(carId: number): Promise<ServiceHistory[]> {
    return this.request<ServiceHistory[]>(`/api/cars/${carId}/service-history`);
  }

  async createServiceHistory(carId: number, service: Omit<ServiceHistory, 'id' | 'user_id' | 'car_id' | 'created_at'>): Promise<ServiceHistory> {
    return this.request<ServiceHistory>(`/api/cars/${carId}/service-history`, {
      method: 'POST',
      body: JSON.stringify({
        ...service,
        car_id: carId  // Include car_id in the request body as required by schema
      }),
    });
  }

  async updateServiceHistory(serviceId: number, service: Partial<Omit<ServiceHistory, 'id' | 'user_id' | 'car_id' | 'created_at'>>): Promise<ServiceHistory> {
    return this.request<ServiceHistory>(`/api/service-history/${serviceId}`, {
      method: 'PUT',
      body: JSON.stringify(service),
    });
  }

  async deleteServiceHistory(serviceId: number): Promise<void> {
    return this.request<void>(`/api/service-history/${serviceId}`, {
      method: 'DELETE',
    });
  }
}

// Export the axios-based service as the main apiService
import { apiServiceAxios } from './apiAxios';
export const apiService = apiServiceAxios; 