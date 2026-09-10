import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  Firestore,
} from 'firebase/firestore';
import { CustomerRecord, UserRecord, DriverRecord, AuditLogRecord } from './types';

let db: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  if (db) return db;

  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      console.warn('firebase-applet-config.json not found, running local-only.');
      return null;
    }

    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);

    const app = getApps().length === 0 ? initializeApp(config) : getApp();
    db = getFirestore(app, config.firestoreDatabaseId);
    console.log('Server connected to Firestore database:', config.firestoreDatabaseId);
    return db;
  } catch (err) {
    console.error('Failed to initialize Firestore on server:', err);
    return null;
  }
}

// Save customer to Firestore
export async function syncCustomerToFirestore(customer: CustomerRecord): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    const docRef = doc(fdb, 'customers', customer.id);
    await setDoc(docRef, customer, { merge: true });
  } catch (err) {
    console.error(`Failed to sync customer ${customer.id} to Firestore:`, err);
  }
}

// Delete customer from Firestore
export async function deleteCustomerFromFirestore(customerId: string): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    const docRef = doc(fdb, 'customers', customerId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Failed to delete customer ${customerId} from Firestore:`, err);
  }
}

// Save user to Firestore
export async function syncUserToFirestore(user: UserRecord): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    const docRef = doc(fdb, 'users', user.id);
    await setDoc(docRef, user, { merge: true });
  } catch (err) {
    console.error(`Failed to sync user ${user.id} to Firestore:`, err);
  }
}

// Delete user from Firestore
export async function deleteUserFromFirestore(userId: string): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    const docRef = doc(fdb, 'users', userId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Failed to delete user ${userId} from Firestore:`, err);
  }
}

// Save driver to Firestore
export async function syncDriverToFirestore(driver: DriverRecord): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    const docRef = doc(fdb, 'drivers', driver.id);
    await setDoc(docRef, driver, { merge: true });
  } catch (err) {
    console.error(`Failed to sync driver ${driver.id} to Firestore:`, err);
  }
}

// Delete driver from Firestore
export async function deleteDriverFromFirestore(driverId: string): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    const docRef = doc(fdb, 'drivers', driverId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Failed to delete driver ${driverId} from Firestore:`, err);
  }
}

// Save log to Firestore
export async function syncLogToFirestore(log: AuditLogRecord): Promise<void> {
  const fdb = getFirestoreDb();
  if (!fdb) return;
  try {
    const docRef = doc(fdb, 'logs', log.id);
    await setDoc(docRef, log);
  } catch (err) {
    console.error(`Failed to sync log ${log.id} to Firestore:`, err);
  }
}

// Initial Sync from Firestore (Load cloud records on startup if cloud has existing records)
export async function loadInitialDataFromFirestore(): Promise<{
  customers?: CustomerRecord[];
  users?: UserRecord[];
  drivers?: DriverRecord[];
  logs?: AuditLogRecord[];
}> {
  const fdb = getFirestoreDb();
  if (!fdb) return {};

  const result: {
    customers?: CustomerRecord[];
    users?: UserRecord[];
    drivers?: DriverRecord[];
    logs?: AuditLogRecord[];
  } = {};

  try {
    // Customers
    const custSnap = await getDocs(collection(fdb, 'customers'));
    if (!custSnap.empty) {
      result.customers = custSnap.docs.map(d => d.data() as CustomerRecord);
    }

    // Users
    const userSnap = await getDocs(collection(fdb, 'users'));
    if (!userSnap.empty) {
      result.users = userSnap.docs.map(d => d.data() as UserRecord);
    }

    // Drivers
    const driverSnap = await getDocs(collection(fdb, 'drivers'));
    if (!driverSnap.empty) {
      result.drivers = driverSnap.docs.map(d => d.data() as DriverRecord);
    }

    // Logs
    const logSnap = await getDocs(collection(fdb, 'logs'));
    if (!logSnap.empty) {
      result.logs = logSnap.docs.map(d => d.data() as AuditLogRecord);
    }
  } catch (err) {
    console.error('Error fetching initial records from Firestore:', err);
  }

  return result;
}
