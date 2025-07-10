import axiosClient, { tokenManager } from './axiosClient';
import type { 
  User, UserLogin, UserCreate, UserCreateByAdmin, AuthResponse,
  Car, CarCreate, ToDo, ToDoCreate,
  ServiceInterval, ServiceIntervalCreate, ServiceResearchResponse,
  ServiceHistory
} from './api';

class ApiServiceAxios {
  // Authentication endpoints
  async login(credentials: UserLogin): Promise<AuthResponse> {
    const response = await axiosClient.post<AuthResponse>('/auth/login', credentials);
    tokenManager.setToken(response.data.access_token);
    return response.data;
  }

  async register(user: UserCreate): Promise<User> {
    const response = await axiosClient.post<User>('/auth/register', user);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await axiosClient.get<User>('/auth/me');
    return response.data;
  }

  logout() {
    tokenManager.clearToken();
  }

  async refreshToken(): Promise<AuthResponse> {
    const response = await axiosClient.post<AuthResponse>('/auth/refresh');
    tokenManager.setToken(response.data.access_token);
    return response.data;
  }

  // Admin endpoints
  async getUsers(): Promise<User[]> {
    const response = await axiosClient.get<User[]>('/admin/users/');
    return response.data;
  }

  async createUserByAdmin(user: UserCreateByAdmin): Promise<User> {
    const response = await axiosClient.post<User>('/admin/users/', user);
    return response.data;
  }

  // Car endpoints
  async getCars(): Promise<Car[]> {
    const response = await axiosClient.get<Car[]>('/cars/');
    return response.data;
  }

  async getCar(id: number): Promise<Car> {
    const response = await axiosClient.get<Car>(`/cars/${id}`);
    return response.data;
  }

  async createCar(car: CarCreate): Promise<Car> {
    const response = await axiosClient.post<Car>('/cars/', car);
    return response.data;
  }

  async updateCar(id: number, car: Partial<CarCreate>): Promise<Car> {
    const response = await axiosClient.put<Car>(`/cars/${id}`, car);
    return response.data;
  }

  async deleteCar(id: number): Promise<void> {
    await axiosClient.delete(`/cars/${id}`);
  }

  // Group endpoints
  async getCarGroups(): Promise<string[]> {
    const response = await axiosClient.get<string[]>('/cars/groups/');
    return response.data;
  }

  // ToDo endpoints
  async getTodos(carId?: number): Promise<ToDo[]> {
    if (!carId) return [];
    const response = await axiosClient.get<ToDo[]>(`/cars/${carId}/todos/`);
    return response.data;
  }

  async getTodo(id: number): Promise<ToDo> {
    const response = await axiosClient.get<ToDo>(`/todos/${id}`);
    return response.data;
  }

  async createTodo(todo: ToDoCreate): Promise<ToDo> {
    const response = await axiosClient.post<ToDo>(`/cars/${todo.car_id}/todos/`, {
      car_id: todo.car_id,
      title: todo.title,
      description: todo.description,
      due_date: todo.due_date || null,
      priority: todo.priority,
    });
    return response.data;
  }

  async updateTodo(id: number, todo: Partial<ToDoCreate> & { completed?: boolean }): Promise<ToDo> {
    const response = await axiosClient.put<ToDo>(`/todos/${id}`, todo);
    return response.data;
  }

  async deleteTodo(id: number): Promise<void> {
    await axiosClient.delete(`/todos/${id}`);
  }

  // Service Interval endpoints
  async researchServiceIntervals(carId: number, engineType?: string): Promise<ServiceResearchResponse> {
    const url = engineType 
      ? `/api/cars/${carId}/research-intervals?engine_type=${engineType}`
      : `/api/cars/${carId}/research-intervals`;
    
    const response = await axiosClient.post<ServiceResearchResponse>(url);
    return response.data;
  }

  async getServiceIntervals(carId: number): Promise<ServiceInterval[]> {
    const response = await axiosClient.get<ServiceInterval[]>(`/api/cars/${carId}/service-intervals`);
    return response.data;
  }

  async createServiceIntervals(carId: number, intervals: ServiceIntervalCreate[]): Promise<ServiceInterval[]> {
    const response = await axiosClient.post<ServiceInterval[]>(`/api/cars/${carId}/service-intervals/bulk`, intervals);
    return response.data;
  }
  
  async createServiceInterval(carId: number, interval: ServiceIntervalCreate): Promise<ServiceInterval> {
    const response = await axiosClient.post<ServiceInterval>(`/api/cars/${carId}/service-intervals`, interval);
    return response.data;
  }

  async updateServiceInterval(intervalId: number, interval: Partial<ServiceIntervalCreate>): Promise<ServiceInterval> {
    const response = await axiosClient.put<ServiceInterval>(`/api/service-intervals/${intervalId}`, interval);
    return response.data;
  }

  async deleteServiceInterval(intervalId: number): Promise<void> {
    await axiosClient.delete(`/api/service-intervals/${intervalId}`);
  }

  async getServiceHistory(carId: number): Promise<ServiceHistory[]> {
    const response = await axiosClient.get<ServiceHistory[]>(`/api/cars/${carId}/service-history`);
    return response.data;
  }

  async createServiceHistory(carId: number, service: Omit<ServiceHistory, 'id' | 'user_id' | 'car_id' | 'created_at'>): Promise<ServiceHistory> {
    const response = await axiosClient.post<ServiceHistory>(`/api/cars/${carId}/service-history`, {
      ...service,
      car_id: carId
    });
    return response.data;
  }

  async updateServiceHistory(serviceId: number, service: Partial<Omit<ServiceHistory, 'id' | 'user_id' | 'car_id' | 'created_at'>>): Promise<ServiceHistory> {
    const response = await axiosClient.put<ServiceHistory>(`/api/service-history/${serviceId}`, service);
    return response.data;
  }

  async deleteServiceHistory(serviceId: number): Promise<void> {
    await axiosClient.delete(`/api/service-history/${serviceId}`);
  }

  // Data Management endpoints
  async exportData(options?: {
    includeCars?: boolean;
    includeTodos?: boolean;
    includeServiceIntervals?: boolean;
    includeServiceHistory?: boolean;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (options) {
      params.append('include_cars', String(options.includeCars ?? true));
      params.append('include_todos', String(options.includeTodos ?? true));
      params.append('include_service_intervals', String(options.includeServiceIntervals ?? true));
      params.append('include_service_history', String(options.includeServiceHistory ?? true));
    }
    
    const response = await axiosClient.post(`/data/export?${params.toString()}`, {}, {
      responseType: 'text'  // Important: XML response as text
    });
    return response;  // Return full response so we can access response.data
  }

  async importData(formData: FormData): Promise<any> {
    const response = await axiosClient.post('/data/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async clearAllData(): Promise<any> {
    const response = await axiosClient.delete('/data/clear-all');
    return response.data;
  }

  // Token management (exposed for compatibility)
  setToken(token: string | null) {
    tokenManager.setToken(token);
  }

  getToken(): string | null {
    return tokenManager.getToken();
  }
}

export const apiServiceAxios = new ApiServiceAxios();
export const apiAxios = axiosClient; // Export axios instance for direct use