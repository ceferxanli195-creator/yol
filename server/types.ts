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

export interface UserRecord {
  id: string;
  loginId: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  permissions: UserPermissions;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  lastActivity?: string;
}

export interface CustomerRecord {
  id: string;
  ownerId: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface DriverRecord {
  id: string;
  loginId: string;
  passwordHash: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogRecord {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  entityType: 'CUSTOMER' | 'USER' | 'DRIVER' | 'PERMISSION' | 'AUTH' | 'BACKUP' | 'LOG';
  entityId?: string;
  customerId?: string;
  customerName?: string;
  details: string;
  oldData?: any;
  newData?: any;
  createdAt: string;
}
