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
  phone?: string;
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
  assignedDriverId?: string | null;
  assignedDriverName?: string | null;
  assignedAt?: string | null;
  assignedBy?: string | null;
  currentDeliveryStatus?: DeliveryStatus | 'none';
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus = 'assigned' | 'in_transit' | 'delivered';

export interface Delivery {
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
  deliveredAt: string | null;
  deliveredBy: string | null;
  deliveredByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
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
  actionType?: string;
  entityType: string;
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

export interface DashboardStats {
  totalUsers?: number;
  activeUsers?: number;
  totalCustomers: number;
  activeCustomers?: number;
  deletedCustomers?: number;
  totalDrivers?: number;
  activeDrivers?: number;
  todayCustomers?: number;
  todayDrivers?: number;
  todayOperations?: number;
  pendingAssignments?: number;
  // Delivery stats
  totalDeliveries?: number;
  todayDelivered?: number;
  inTransitDeliveries?: number;
  deliveredDeliveries?: number;
  pendingDeliveries?: number;
  myCustomers?: number;
  assignedDeliveries?: number;
  todayAssignedDeliveries?: number;
  driverAssignedCustomers?: number;
  lastDelivery?: Delivery | null;
  recentCustomers?: Customer[];
  recentDrivers?: Driver[];
  recentAssignments?: Array<{
    id: string;
    customerName: string;
    driverName: string;
    assignedAt: string;
  }>;
  recentActivities?: AuditLog[];
  userGroups?: Array<{
    userId: string;
    userName: string;
    customerCount: number;
  }>;
}
