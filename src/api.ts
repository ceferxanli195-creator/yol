import { User, Customer, Driver, AuditLog, DashboardStats } from './types';

const TOKEN_KEY = 'mustari_gps_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setStoredToken(null);
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Sessiyanın vaxtı bitdi. Zəhmət olmasa yenidən daxil olun.');
  }

  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message = (data && data.error) ? data.error : 'Əməliyyat zamanı xəta baş verdi.';
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (loginId: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginId, password }),
    }),

  logout: () =>
    request<{ success: boolean }>('/api/auth/logout', {
      method: 'POST',
    }),

  getCurrentUser: () =>
    request<{ user: User }>('/api/auth/me'),

  changePassword: (oldPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('/api/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  // Dashboard
  getStats: () =>
    request<DashboardStats>('/api/dashboard/stats'),

  // Customers
  getCustomers: (params?: { search?: string; ownerId?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.ownerId) q.set('ownerId', params.ownerId);
    return request<{ customers: Customer[] }>(`/api/customers?${q.toString()}`);
  },

  getCustomerById: (id: string) =>
    request<{ customer: Customer }>(`/api/customers/${id}`),

  createCustomer: (data: Partial<Customer>) =>
    request<{ customer: Customer }>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCustomer: (id: string, data: Partial<Customer>) =>
    request<{ customer: Customer }>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCustomer: (id: string) =>
    request<{ success: boolean; customer: Customer }>(`/api/customers/${id}`, {
      method: 'DELETE',
    }),

  // Trash
  getTrash: () =>
    request<{ trash: Customer[] }>('/api/trash'),

  restoreCustomer: (id: string) =>
    request<{ success: boolean; customer: Customer }>(`/api/customers/${id}/restore`, {
      method: 'POST',
    }),

  permanentDeleteCustomer: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/customers/${id}/permanent`, {
      method: 'DELETE',
    }),

  // Users (Admin only)
  getUsers: () =>
    request<{ users: User[] }>('/api/users'),

  createUser: (userData: any) =>
    request<{ user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  updateUser: (id: string, userData: any) =>
    request<{ user: User }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  deleteUser: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/users/${id}`, {
      method: 'DELETE',
    }),

  // Drivers
  getDrivers: () =>
    request<{ drivers: Driver[] }>('/api/drivers'),

  createDriver: (driverData: any) =>
    request<{ driver: Driver }>('/api/drivers', {
      method: 'POST',
      body: JSON.stringify(driverData),
    }),

  updateDriver: (id: string, driverData: any) =>
    request<{ driver: Driver }>(`/api/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(driverData),
    }),

  deleteDriver: (id: string) =>
    request<{ success: boolean }>(`/api/drivers/${id}`, {
      method: 'DELETE',
    }),

  // Audit Logs
  getLogs: (params?: { search?: string; action?: string; entityType?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.action) q.set('action', params.action);
    if (params?.entityType) q.set('entityType', params.entityType);
    return request<{ logs: AuditLog[] }>(`/api/logs?${q.toString()}`);
  },

  deleteLogs: (logIds: string[], all: boolean = false) =>
    request<{ success: boolean; count?: number; message?: string }>('/api/logs', {
      method: 'DELETE',
      body: JSON.stringify({ logIds, all }),
    }),

  // Backup & Restore
  exportBackup: async () => {
    const token = getStoredToken();
    const response = await fetch('/api/backup/export', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('Backup yüklənərkən xəta baş verdi.');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mustari_gps_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  restoreBackup: (backupData: any) =>
    request<{ success: boolean; count: number; message: string }>('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ backupData }),
    }),
};
