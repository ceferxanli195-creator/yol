export type UserRole = 'ADMIN' | 'USER' | 'DRIVER';
export type UserStatus = 'active' | 'inactive';

export interface UserPermissions {
  view_customers: boolean;
  create_customer: boolean;
  edit_customer: boolean;
  delete_customer: boolean;
  use_gps: boolean;
  view_map: boolean;
  backup_data: boolean;
  restore_data: boolean;
  view_drivers: boolean;
}

export interface User {
  id: string;
  loginId: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  permissions: UserPermissions;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  lastActivity?: string;
  customerCount?: number;
}

export interface Customer {
  id: string;
  ownerId: string;
  ownerName?: string;
  createdBy: string;
  updatedBy: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  phoneNormalized: string;
  address: string;
  notes?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  photoUrl?: string;
  status: 'active' | 'inactive';
  isDeleted: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  loginId: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  entityType: string;
  entityId?: string;
  customerId?: string;
  customerName?: string;
  details: string;
  oldData?: any;
  newData?: any;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers?: number;
  activeUsers?: number;
  totalCustomers: number;
  activeCustomers?: number;
  deletedCustomers?: number;
  totalDrivers?: number;
  activeDrivers?: number;
  recentCustomers?: Customer[];
  recentActivities?: AuditLog[];
  userGroups?: Array<{
    userId: string;
    userName: string;
    customerCount: number;
  }>;
}
