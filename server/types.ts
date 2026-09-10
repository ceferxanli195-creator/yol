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
  phone?: string;
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
  assignedDriverId?: string | null;
  assignedDriverName?: string | null;
  assignedAt?: string | null;
  assignedBy?: string | null;
  currentDeliveryStatus?: DeliveryStatus | null;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus = 'assigned' | 'in_transit' | 'delivered' | 'cancelled' | 'returned';

export interface DeliveryRecord {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNotes?: string;
  customerLatitude: number;
  customerLongitude: number;
  ownerId: string;
  ownerName: string;
  driverId: string;
  driverName: string;
  assignedBy: string;
  assignedByName: string;
  status: DeliveryStatus;
  notes?: string;
  assignedAt: string;
  deliveredAt?: string | null;
  deliveredBy?: string | null;
  deliveredByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'delivery_delivered' | 'delivery_assigned' | 'system';
  deliveryId?: string;
  customerId?: string;
  customerName?: string;
  driverId?: string;
  driverName?: string;
  status?: string;
  deliveredAt?: string;
  isRead: boolean;
  createdAt: string;
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
  actionType?: string;
  entityType: 'CUSTOMER' | 'USER' | 'DRIVER' | 'PERMISSION' | 'AUTH' | 'BACKUP' | 'LOG' | 'ASSIGNMENT' | 'DELIVERY';
  entityId?: string;
  customerId?: string;
  customerName?: string;
  driverId?: string;
  driverName?: string;
  details: string;
  oldData?: any;
  newData?: any;
  createdAt: string;
}
