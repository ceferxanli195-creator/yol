import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UserRecord, CustomerRecord, DriverRecord, AuditLogRecord, UserPermissions } from './types';
import {
  syncCustomerToFirestore,
  deleteCustomerFromFirestore,
  syncUserToFirestore,
  deleteUserFromFirestore,
  syncDriverToFirestore,
  deleteDriverFromFirestore,
  syncLogToFirestore,
  loadInitialDataFromFirestore,
} from './firestore';

const DATA_DIR = path.join(process.cwd(), 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json');
const DRIVERS_FILE = path.join(DATA_DIR, 'drivers.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      writeJsonFile(filePath, defaultValue);
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filePath: string, data: T): void {
  const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(7)}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

export function hashPassword(password: string): string {
  const salt = 'mustari_gps_secure_salt_2026';
  return crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function normalizePhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('994') && digits.length >= 12) {
    return digits;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return '994' + digits.substring(1);
  }
  if (digits.length === 9) {
    return '994' + digits;
  }
  return digits;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  view_customers: true,
  create_customer: true,
  edit_customer: true,
  delete_customer: true,
  use_gps: true,
  view_map: true,
  backup_data: true,
  restore_data: true,
  view_drivers: true,
};

class Database {
  private users: UserRecord[] = [];
  private customers: CustomerRecord[] = [];
  private drivers: DriverRecord[] = [];
  private logs: AuditLogRecord[] = [];

  constructor() {
    this.reload();
    this.ensureInitialAdmin();
    this.initFirestoreSync();
  }

  private async initFirestoreSync() {
    try {
      const cloudData = await loadInitialDataFromFirestore();
      if (cloudData.customers && cloudData.customers.length > 0) {
        const idMap = new Map(this.customers.map(c => [c.id, c]));
        for (const c of cloudData.customers) {
          idMap.set(c.id, c);
        }
        this.customers = Array.from(idMap.values());
        this.saveCustomers();
      }
      if (cloudData.users && cloudData.users.length > 0) {
        const idMap = new Map(this.users.map(u => [u.id, u]));
        for (const u of cloudData.users) {
          idMap.set(u.id, u);
        }
        this.users = Array.from(idMap.values());
        this.saveUsers();
      }
      if (cloudData.drivers && cloudData.drivers.length > 0) {
        const idMap = new Map(this.drivers.map(d => [d.id, d]));
        for (const d of cloudData.drivers) {
          idMap.set(d.id, d);
        }
        this.drivers = Array.from(idMap.values());
        this.saveDrivers();
      }
      for (const u of this.users) {
        syncUserToFirestore(u);
      }
      for (const c of this.customers) {
        syncCustomerToFirestore(c);
      }
      for (const d of this.drivers) {
        syncDriverToFirestore(d);
      }
    } catch (err) {
      console.warn('Firestore initial sync notice:', err);
    }
  }

  public reload() {
    this.users = readJsonFile<UserRecord[]>(USERS_FILE, []);
    this.customers = readJsonFile<CustomerRecord[]>(CUSTOMERS_FILE, []);
    this.drivers = readJsonFile<DriverRecord[]>(DRIVERS_FILE, []);
    this.logs = readJsonFile<AuditLogRecord[]>(LOGS_FILE, []);
  }

  private saveUsers() {
    writeJsonFile(USERS_FILE, this.users);
  }

  private saveCustomers() {
    writeJsonFile(CUSTOMERS_FILE, this.customers);
  }

  private saveDrivers() {
    writeJsonFile(DRIVERS_FILE, this.drivers);
  }

  private saveLogs() {
    writeJsonFile(LOGS_FILE, this.logs);
  }

  private ensureInitialAdmin() {
    if (this.users.length === 0) {
      const now = new Date().toISOString();
      const admin: UserRecord = {
        id: 'usr_admin_master',
        loginId: 'admin',
        name: 'Sistem Admini',
        passwordHash: hashPassword('admin123'),
        role: 'ADMIN',
        status: 'active',
        permissions: { ...DEFAULT_PERMISSIONS },
        createdAt: now,
        updatedAt: now,
      };
      this.users.push(admin);
      this.saveUsers();
      syncUserToFirestore(admin);
      console.log('Master admin account created with loginId: admin');
    }
  }

  // --- Users ---
  public getUsers(): UserRecord[] {
    return this.users;
  }

  public getUserById(id: string): UserRecord | undefined {
    return this.users.find(u => u.id === id);
  }

  public getUserByLoginId(loginId: string): UserRecord | undefined {
    return this.users.find(u => u.loginId.toLowerCase() === loginId.toLowerCase().trim());
  }

  public createUser(userData: {
    loginId: string;
    password: string;
    name: string;
    role: 'ADMIN' | 'USER' | 'DRIVER';
    status: 'active' | 'inactive';
    permissions?: Partial<UserPermissions>;
  }): UserRecord {
    const cleanLoginId = userData.loginId.toLowerCase().trim();
    if (this.getUserByLoginId(cleanLoginId)) {
      throw new Error('Bu ID ilə istifadəçi artıq mövcuddur.');
    }
    const now = new Date().toISOString();
    const newUser: UserRecord = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      loginId: cleanLoginId,
      passwordHash: hashPassword(userData.password),
      name: userData.name.trim(),
      role: userData.role,
      status: userData.status,
      permissions: {
        ...DEFAULT_PERMISSIONS,
        ...(userData.permissions || {})
      },
      createdAt: now,
      updatedAt: now,
    };
    this.users.push(newUser);
    this.saveUsers();
    syncUserToFirestore(newUser);
    return newUser;
  }

  public updateUser(id: string, updates: {
    name?: string;
    password?: string;
    role?: 'ADMIN' | 'USER' | 'DRIVER';
    status?: 'active' | 'inactive';
    permissions?: UserPermissions;
    lastLogin?: string;
    lastActivity?: string;
  }): UserRecord {
    const user = this.getUserById(id);
    if (!user) throw new Error('İstifadəçi tapılmadı.');

    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.password) user.passwordHash = hashPassword(updates.password);
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.status !== undefined) user.status = updates.status;
    if (updates.permissions !== undefined) user.permissions = updates.permissions;
    if (updates.lastLogin !== undefined) user.lastLogin = updates.lastLogin;
    if (updates.lastActivity !== undefined) user.lastActivity = updates.lastActivity;
    user.updatedAt = new Date().toISOString();

    this.saveUsers();
    syncUserToFirestore(user);
    return user;
  }

  public deleteUser(id: string): void {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) throw new Error('İstifadəçi tapılmadı.');
    if (this.users[index].role === 'ADMIN' && this.users.filter(u => u.role === 'ADMIN').length <= 1) {
      throw new Error('Sistemdəki yeganə Admin silinə bilməz.');
    }
    this.users.splice(index, 1);
    this.saveUsers();
    deleteUserFromFirestore(id);
  }

  // --- Customers ---
  public getCustomers(includeDeleted: boolean = false): CustomerRecord[] {
    if (includeDeleted) return this.customers;
    return this.customers.filter(c => !c.isDeleted);
  }

  public getCustomerById(id: string): CustomerRecord | undefined {
    return this.customers.find(c => c.id === id);
  }

  public createCustomer(data: {
    ownerId: string;
    createdBy: string;
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    notes?: string;
    latitude: number;
    longitude: number;
    accuracy: number;
    photoUrl?: string;
  }): CustomerRecord {
    const now = new Date().toISOString();
    const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
    const customer: CustomerRecord = {
      id: 'cst_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      ownerId: data.ownerId,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      fullName,
      phone: data.phone.trim(),
      phoneNormalized: normalizePhone(data.phone),
      address: data.address.trim(),
      notes: data.notes?.trim() || '',
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      accuracy: Number(data.accuracy) || 0,
      photoUrl: data.photoUrl || '',
      status: 'active',
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdAt: now,
      updatedAt: now,
    };
    this.customers.push(customer);
    this.saveCustomers();
    syncCustomerToFirestore(customer);
    return customer;
  }

  public updateCustomer(id: string, updates: Partial<CustomerRecord> & { updatedBy: string }): CustomerRecord {
    const customer = this.getCustomerById(id);
    if (!customer) throw new Error('Müştəri tapılmadı.');

    if (updates.firstName !== undefined) customer.firstName = updates.firstName.trim();
    if (updates.lastName !== undefined) customer.lastName = updates.lastName.trim();
    customer.fullName = `${customer.firstName} ${customer.lastName}`.trim();

    if (updates.phone !== undefined) {
      customer.phone = updates.phone.trim();
      customer.phoneNormalized = normalizePhone(updates.phone);
    }
    if (updates.address !== undefined) customer.address = updates.address.trim();
    if (updates.notes !== undefined) customer.notes = updates.notes.trim();
    if (updates.latitude !== undefined) customer.latitude = Number(updates.latitude);
    if (updates.longitude !== undefined) customer.longitude = Number(updates.longitude);
    if (updates.accuracy !== undefined) customer.accuracy = Number(updates.accuracy);
    if (updates.photoUrl !== undefined) customer.photoUrl = updates.photoUrl;
    if (updates.ownerId !== undefined) customer.ownerId = updates.ownerId;
    if (updates.status !== undefined) customer.status = updates.status;

    customer.updatedBy = updates.updatedBy;
    customer.updatedAt = new Date().toISOString();

    this.saveCustomers();
    syncCustomerToFirestore(customer);
    return customer;
  }

  public softDeleteCustomer(id: string, deletedBy: string): CustomerRecord {
    const customer = this.getCustomerById(id);
    if (!customer) throw new Error('Müştəri tapılmadı.');
    customer.isDeleted = true;
    customer.deletedAt = new Date().toISOString();
    customer.deletedBy = deletedBy;
    customer.updatedAt = new Date().toISOString();
    this.saveCustomers();
    syncCustomerToFirestore(customer);
    return customer;
  }

  public restoreCustomer(id: string, restoredBy: string): CustomerRecord {
    const customer = this.getCustomerById(id);
    if (!customer) throw new Error('Müştəri tapılmadı.');
    customer.isDeleted = false;
    customer.deletedAt = null;
    customer.deletedBy = null;
    customer.updatedBy = restoredBy;
    customer.updatedAt = new Date().toISOString();
    this.saveCustomers();
    syncCustomerToFirestore(customer);
    return customer;
  }

  public permanentDeleteCustomer(id: string): void {
    const index = this.customers.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Müştəri tapılmadı.');
    this.customers.splice(index, 1);
    this.saveCustomers();
    deleteCustomerFromFirestore(id);
  }

  // --- Drivers ---
  public getDrivers(): DriverRecord[] {
    return this.drivers;
  }

  public getDriverById(id: string): DriverRecord | undefined {
    return this.drivers.find(d => d.id === id);
  }

  public getDriverByLoginId(loginId: string): DriverRecord | undefined {
    return this.drivers.find(d => d.loginId.toLowerCase() === loginId.toLowerCase().trim());
  }

  public createDriver(data: {
    loginId: string;
    password: string;
    name: string;
    phone: string;
    status: 'active' | 'inactive';
  }): DriverRecord {
    const cleanLoginId = data.loginId.toLowerCase().trim();
    if (this.getDriverByLoginId(cleanLoginId) || this.getUserByLoginId(cleanLoginId)) {
      throw new Error('Bu ID artıq başqa istifadəçi və ya sürücü tərəfindən istifadə olunur.');
    }
    const now = new Date().toISOString();
    const driver: DriverRecord = {
      id: 'drv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      loginId: cleanLoginId,
      passwordHash: hashPassword(data.password),
      name: data.name.trim(),
      phone: data.phone.trim(),
      status: data.status,
      createdAt: now,
      updatedAt: now,
    };
    this.drivers.push(driver);
    this.saveDrivers();
    syncDriverToFirestore(driver);
    return driver;
  }

  public updateDriver(id: string, data: {
    name?: string;
    phone?: string;
    password?: string;
    status?: 'active' | 'inactive';
  }): DriverRecord {
    const driver = this.getDriverById(id);
    if (!driver) throw new Error('Sürücü tapılmadı.');
    if (data.name !== undefined) driver.name = data.name.trim();
    if (data.phone !== undefined) driver.phone = data.phone.trim();
    if (data.status !== undefined) driver.status = data.status;
    if (data.password) driver.passwordHash = hashPassword(data.password);
    driver.updatedAt = new Date().toISOString();
    this.saveDrivers();
    syncDriverToFirestore(driver);
    return driver;
  }

  public deleteDriver(id: string): void {
    const index = this.drivers.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Sürücü tapılmadı.');
    this.drivers.splice(index, 1);
    this.saveDrivers();
    deleteDriverFromFirestore(id);
  }

  // --- Audit Logs ---
  public getLogs(): AuditLogRecord[] {
    return this.logs;
  }

  public addLog(entry: {
    userId: string;
    userName: string;
    role: 'ADMIN' | 'USER' | 'DRIVER';
    action: string;
    entityType: 'CUSTOMER' | 'USER' | 'DRIVER' | 'PERMISSION' | 'AUTH' | 'BACKUP' | 'LOG';
    entityId?: string;
    customerId?: string;
    customerName?: string;
    details: string;
    oldData?: any;
    newData?: any;
  }): AuditLogRecord {
    const record: AuditLogRecord = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      ...entry,
      createdAt: new Date().toISOString(),
    };
    this.logs.unshift(record); // newest first
    // keep up to 5000 logs
    if (this.logs.length > 5000) {
      this.logs = this.logs.slice(0, 5000);
    }
    this.saveLogs();
    syncLogToFirestore(record);
    return record;
  }

  public deleteLogs(logIds: string[]): number {
    const idSet = new Set(logIds);
    const prevCount = this.logs.length;
    this.logs = this.logs.filter(l => !idSet.has(l.id));
    this.saveLogs();
    return prevCount - this.logs.length;
  }

  public clearAllLogs(): void {
    this.logs = [];
    this.saveLogs();
  }
}

export const db = new Database();
