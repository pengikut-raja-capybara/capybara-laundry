import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { generateId } from '../lib/format';

export type SyncStatus = 'pending' | 'synced';

export interface BusinessSettings {
  shopName: string;
  tagline: string;
  phone: string;
  address: string;
  defaultPricePerKg: number;
  initialCashBalance: number;
  receiptFooter: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  sync_status: SyncStatus;
}

export type ServiceUnit = 'kg' | 'pcs' | 'pasang' | 'meter';
export type ServiceCategoryType = 'kiloan' | 'satuan' | 'express' | 'addon';

export interface LaundryService {
  id: string;
  name: string;
  category: ServiceCategoryType;
  unit: ServiceUnit;
  price: number; // integer Rupiah
  duration_hours: number;
  is_default: number; // 1 or 0
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  sync_status: SyncStatus;
}

export interface Promo {
  id: string;
  code: string;
  name: string;
  discount_type: 'percent' | 'nominal';
  discount_value: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  sync_status: SyncStatus;
}

export type OrderStatus = 'diterima' | 'diproses' | 'selesai' | 'diambil';
export type PaymentStatus = 'lunas' | 'dp' | 'belum_lunas';
export type PaymentMethod = 'Tunai' | 'Transfer bank' | 'QRIS';

export interface OrderItem {
  id: string;
  order_id: string;
  service_id: string | null;
  service_name: string;
  unit: ServiceUnit;
  qty: number;
  price_per_unit: number;
  subtotal: number;
}

export interface LaundryOrder {
  id: string;
  order_code: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  total_weight_kg: number;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  status: OrderStatus;
  estimated_done_at: string;
  notes: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  sync_status: SyncStatus;
  items?: OrderItem[];
}

export type TransactionType = 'income' | 'expense';

export interface CashTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  title: string;
  category: string;
  payment_method: PaymentMethod;
  transaction_date: string;
  notes: string;
  proof_uri: string | null;
  order_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
  sync_status: SyncStatus;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error('Web fallback handled by memory store');
  }
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('candry_pos.db');
  }
  return dbInstance;
}

export async function initializeDatabase(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  const db = await getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      address TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL,
      version INTEGER DEFAULT 1,
      sync_status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'kiloan',
      unit TEXT NOT NULL DEFAULT 'kg',
      price INTEGER NOT NULL,
      duration_hours INTEGER NOT NULL DEFAULT 48,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL,
      version INTEGER DEFAULT 1,
      sync_status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS promos (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      discount_type TEXT NOT NULL DEFAULT 'nominal',
      discount_value INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL,
      version INTEGER DEFAULT 1,
      sync_status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY NOT NULL,
      order_code TEXT NOT NULL,
      customer_id TEXT DEFAULT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT DEFAULT '',
      total_weight_kg REAL NOT NULL DEFAULT 0,
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      paid_amount INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'lunas',
      payment_method TEXT NOT NULL DEFAULT 'Tunai',
      status TEXT NOT NULL DEFAULT 'diterima',
      estimated_done_at TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL,
      version INTEGER DEFAULT 1,
      sync_status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY NOT NULL,
      order_id TEXT NOT NULL,
      service_id TEXT DEFAULT NULL,
      service_name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'kg',
      qty REAL NOT NULL DEFAULT 1,
      price_per_unit INTEGER NOT NULL DEFAULT 0,
      subtotal INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Tunai',
      transaction_date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      proof_uri TEXT DEFAULT NULL,
      order_id TEXT DEFAULT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT DEFAULT NULL,
      version INTEGER DEFAULT 1,
      sync_status TEXT DEFAULT 'pending'
    );
  `);

  const seededV2 = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    ['clean_seed_v2']
  );

  if (!seededV2) {
    await seedCleanInitialData(db);
  }
}

/**
 * Ensures a clean starting state with ONLY 1 default service ("Cuci Kiloan", Rp7.000/kg)
 * and removes any legacy v1 dummy data if upgrading from the earlier prototype seed.
 */
async function seedCleanInitialData(db: SQLite.SQLiteDatabase): Promise<void> {
  const now = new Date().toISOString();

  const hadV1 = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    ['initial_seeded_v1']
  );

  if (hadV1) {
    // Purge v1 dummy sample rows so existing device immediately becomes clean
    await db.execAsync(`
      DELETE FROM order_items WHERE order_id IN (
        SELECT id FROM orders WHERE order_code IN ('CND-101', 'CND-102', 'CND-103')
      );
      DELETE FROM orders WHERE order_code IN ('CND-101', 'CND-102', 'CND-103');
      DELETE FROM customers WHERE name IN ('Budi Santoso', 'Siti Aminah', 'Andi Wijaya');
      DELETE FROM promos WHERE code IN ('HEMAT10', 'POTONG5RB');
      DELETE FROM transactions WHERE title IN (
        'Laundry Kiloan & Bedcover Hotel',
        'Biaya internet & listrik outlet',
        'Paket Cuci Express & Setrika',
        'Transportasi antar-jemput cucian',
        'Kontrak Laundry Wisma & Kost',
        'Belanja Deterjen & Parfum Sakura',
        'Cuci Satuan Jas, Kebaya & Sepatu',
        'Plastik Kemasan & Hanger Laundry',
        'Pemasukan Harian Cuci Komplit'
      );
      DELETE FROM services WHERE is_default = 0 AND name IN (
        'Cuci Kering Lipat',
        'Setrika Saja',
        'Cuci Express Kilat (6 Jam)',
        'Bedcover Besar / King',
        'Cuci Sepatu Deep Clean'
      );
      UPDATE services SET name = 'Cuci Kiloan' WHERE is_default = 1;
    `);
  }

  const defaultSettings: Record<string, string> = {
    shopName: 'CaNdry Laundry',
    tagline: 'Bersih, Rapi, Wangi',
    phone: '',
    address: '',
    defaultPricePerKg: '7000',
    initialCashBalance: '0',
    receiptFooter: 'Terima kasih telah mencuci di CaNdry.',
    clean_seed_v2: 'true',
  };

  for (const [k, v] of Object.entries(defaultSettings)) {
    if (k === 'clean_seed_v2') {
      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        [k, v, now]
      );
    } else {
      await db.runAsync(
        'INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        [k, v, now]
      );
    }
  }

  const existingDefault = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM services WHERE deleted_at IS NULL LIMIT 1'
  );

  if (!existingDefault) {
    await db.runAsync(
      `INSERT INTO services (id, name, category, unit, price, duration_hours, is_default, created_at, updated_at, sync_status)
       VALUES (?, 'Cuci Kiloan', 'kiloan', 'kg', 7000, 48, 1, ?, ?, 'pending')`,
      [generateId(), now, now]
    );
  }
}
