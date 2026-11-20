import {
  BusinessSettings,
  CashTransaction,
  Customer,
  getDb,
  initializeDatabase,
  LaundryOrder,
  LaundryService,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Promo,
  ServiceCategoryType,
  ServiceUnit,
  TransactionType,
} from '../db/database';
import { generateId, toLocalDateKey } from '../lib/format';

/**
 * Formats sequential order code: e.g. CND-261118-001
 */
export function formatSequentialOrderCode(date: Date, sequenceNumber: number): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const seq = String(Math.max(1, sequenceNumber)).padStart(3, '0');
  return `CND-${yy}${mm}${dd}-${seq}`;
}

export const PosRepository = {
  async init(): Promise<void> {
    await initializeDatabase();
  },

  async getSettings(): Promise<BusinessSettings> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings'
    );
    const map: Record<string, string> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }
    const rawTagline = map.tagline || 'Bersih, Rapi, Wangi';
    const cleanTagline =
      rawTagline === 'Capybara Laundry • Bersih, Rapi, Wangi'
        ? 'Bersih, Rapi, Wangi'
        : rawTagline;

    const rawFooter =
      map.receiptFooter ||
      'Terima kasih telah mempercayakan cucian Anda kepada kami.';
    const cleanFooter =
      rawFooter.includes('mencuci di CaNdry')
        ? 'Terima kasih telah mempercayakan cucian Anda kepada kami.'
        : rawFooter;

    return {
      shopName: map.shopName || 'Laundry Kita',
      tagline: cleanTagline,
      phone: map.phone || '',
      address: map.address || '',
      defaultPricePerKg: parseInt(map.defaultPricePerKg || '7000', 10) || 7000,
      initialCashBalance: parseInt(map.initialCashBalance || '0', 10) || 0,
      receiptFooter: cleanFooter,
    };
  },

  async updateSettings(partial: Partial<BusinessSettings>): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDb();
    for (const [k, v] of Object.entries(partial)) {
      if (v !== undefined) {
        await db.runAsync(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
          [k, String(v), now]
        );
      }
    }
    if (partial.defaultPricePerKg !== undefined && partial.defaultPricePerKg > 0) {
      await db.runAsync(
        'UPDATE services SET price = ?, updated_at = ?, sync_status = ? WHERE is_default = 1',
        [partial.defaultPricePerKg, now, 'pending']
      );
    }
  },

  async getServices(): Promise<LaundryService[]> {
    const db = await getDb();
    return await db.getAllAsync<LaundryService>(
      'SELECT * FROM services WHERE deleted_at IS NULL ORDER BY is_default DESC, name ASC'
    );
  },

  async saveService(input: {
    id?: string;
    name: string;
    category: ServiceCategoryType;
    unit: ServiceUnit;
    price: number;
    duration_hours: number;
    is_default?: number;
  }): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDb();
    if (input.is_default === 1) {
      await db.runAsync('UPDATE services SET is_default = 0');
      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        ['defaultPricePerKg', String(input.price), now]
      );
    }
    if (input.id) {
      await db.runAsync(
        `UPDATE services
         SET name = ?, category = ?, unit = ?, price = ?, duration_hours = ?, is_default = COALESCE(?, is_default),
             updated_at = ?, version = version + 1, sync_status = 'pending'
         WHERE id = ?`,
        [
          input.name,
          input.category,
          input.unit,
          input.price,
          input.duration_hours,
          input.is_default ?? null,
          now,
          input.id,
        ]
      );
    } else {
      await db.runAsync(
        `INSERT INTO services (id, name, category, unit, price, duration_hours, is_default, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          generateId(),
          input.name,
          input.category,
          input.unit,
          input.price,
          input.duration_hours,
          input.is_default ?? 0,
          now,
          now,
        ]
      );
    }
  },

  async deleteService(id: string): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDb();
    await db.runAsync(
      "UPDATE services SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id]
    );
  },

  async getCustomers(): Promise<Customer[]> {
    const db = await getDb();
    return await db.getAllAsync<Customer>(
      'SELECT * FROM customers WHERE deleted_at IS NULL ORDER BY name ASC'
    );
  },

  async saveCustomer(input: {
    id?: string;
    name: string;
    phone?: string;
    address?: string;
    notes?: string;
  }): Promise<Customer> {
    const now = new Date().toISOString();
    const cleanName = input.name.trim();
    const cleanPhone = (input.phone || '').trim();
    const cleanAddr = (input.address || '').trim();
    const cleanNotes = (input.notes || '').trim();

    const db = await getDb();
    if (input.id) {
      await db.runAsync(
        `UPDATE customers SET name = ?, phone = ?, address = ?, notes = ?, updated_at = ?, version = version + 1, sync_status = 'pending' WHERE id = ?`,
        [cleanName, cleanPhone, cleanAddr, cleanNotes, now, input.id]
      );
      const updated = await db.getFirstAsync<Customer>(
        'SELECT * FROM customers WHERE id = ?',
        [input.id]
      );
      return updated!;
    } else {
      const id = generateId();
      await db.runAsync(
        `INSERT INTO customers (id, name, phone, address, notes, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [id, cleanName, cleanPhone, cleanAddr, cleanNotes, now, now]
      );
      return {
        id,
        name: cleanName,
        phone: cleanPhone,
        address: cleanAddr,
        notes: cleanNotes,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        version: 1,
        sync_status: 'pending',
      };
    }
  },

  async deleteCustomer(id: string): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDb();
    await db.runAsync(
      "UPDATE customers SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id]
    );
  },

  async getPromos(): Promise<Promo[]> {
    const db = await getDb();
    return await db.getAllAsync<Promo>(
      'SELECT * FROM promos WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
  },

  async savePromo(input: {
    id?: string;
    code: string;
    name: string;
    discount_type: 'percent' | 'nominal';
    discount_value: number;
  }): Promise<void> {
    const now = new Date().toISOString();
    const code = input.code.trim().toUpperCase();
    const cleanName = input.name.trim();
    const db = await getDb();
    if (input.id) {
      await db.runAsync(
        `UPDATE promos
         SET code = ?, name = ?, discount_type = ?, discount_value = ?,
             updated_at = ?, version = version + 1, sync_status = 'pending'
         WHERE id = ?`,
        [code, cleanName, input.discount_type, input.discount_value, now, input.id]
      );
      return;
    }
    await db.runAsync(
      `INSERT INTO promos (id, code, name, discount_type, discount_value, is_active, created_at, updated_at, sync_status)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'pending')`,
      [generateId(), code, cleanName, input.discount_type, input.discount_value, now, now]
    );
  },

  async deletePromo(id: string): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDb();
    await db.runAsync(
      "UPDATE promos SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id]
    );
  },

  async getOrders(): Promise<LaundryOrder[]> {
    const db = await getDb();
    const orders = await db.getAllAsync<LaundryOrder>(
      'SELECT * FROM orders WHERE deleted_at IS NULL ORDER BY created_at DESC'
    );
    const allItems = await db.getAllAsync<OrderItem>('SELECT * FROM order_items');
    const itemsByOrder: Record<string, OrderItem[]> = {};
    for (const item of allItems) {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    }
    return orders.map((o) => ({
      ...o,
      items: itemsByOrder[o.id] || [],
    }));
  },

  async createOrder(input: {
    customerName: string;
    customerPhone?: string;
    items: {
      serviceId: string | null;
      serviceName: string;
      unit: ServiceUnit;
      qty: number;
      pricePerUnit: number;
    }[];
    discountAmount?: number;
    paymentStatus?: PaymentStatus;
    paidAmount?: number;
    paymentMethod?: PaymentMethod;
    status?: OrderStatus;
    durationHours?: number;
    notes?: string;
  }): Promise<LaundryOrder> {
    const now = new Date();
    const nowIso = now.toISOString();
    const estDone = new Date(
      now.getTime() + (input.durationHours || 48) * 3600 * 1000
    ).toISOString();

    const cleanName = input.customerName.trim() || 'Pelanggan Umum';
    const cleanPhone = (input.customerPhone || '').trim();

    let subtotal = 0;
    let totalWeightKg = 0;
    const orderId = generateId();
    const builtItems: OrderItem[] = input.items.map((it) => {
      const sub = Math.round(it.qty * it.pricePerUnit);
      subtotal += sub;
      if (it.unit === 'kg') {
        totalWeightKg += it.qty;
      }
      return {
        id: generateId(),
        order_id: orderId,
        service_id: it.serviceId,
        service_name: it.serviceName,
        unit: it.unit,
        qty: it.qty,
        price_per_unit: it.pricePerUnit,
        subtotal: sub,
      };
    });

    const discount = Math.min(subtotal, Math.max(0, Math.round(input.discountAmount || 0)));
    const totalAmount = Math.max(0, subtotal - discount);

    const payStatus: PaymentStatus = input.paymentStatus || 'lunas';
    let paidAmount = totalAmount;
    if (payStatus === 'belum_lunas') {
      paidAmount = 0;
    } else if (payStatus === 'dp') {
      paidAmount = Math.min(totalAmount, Math.max(0, Math.round(input.paidAmount || 0)));
    }

    const payMethod: PaymentMethod = input.paymentMethod || 'Tunai';
    const orderStatus: OrderStatus = input.status || 'diterima';

    const db = await getDb();

    // Count today's orders in local time for sequential order code CND-YYMMDD-NNN
    const todayLocalKey = toLocalDateKey(now);
    const existingDates = await db.getAllAsync<{ created_at: string }>(
      'SELECT created_at FROM orders'
    );
    const todayCount = existingDates.filter(
      (r) => toLocalDateKey(r.created_at) === todayLocalKey
    ).length;
    const orderCode = formatSequentialOrderCode(now, todayCount + 1);

    let customerId: string | null = null;

    await db.withTransactionAsync(async () => {
      const existingCust = await db.getFirstAsync<Customer>(
        'SELECT * FROM customers WHERE LOWER(name) = LOWER(?) AND deleted_at IS NULL',
        [cleanName]
      );
      if (existingCust) {
        customerId = existingCust.id;
        if (cleanPhone && !existingCust.phone) {
          await db.runAsync(
            'UPDATE customers SET phone = ?, updated_at = ? WHERE id = ?',
            [cleanPhone, nowIso, existingCust.id]
          );
        }
      } else if (cleanName.toLowerCase() !== 'pelanggan umum') {
        customerId = generateId();
        await db.runAsync(
          `INSERT INTO customers (id, name, phone, address, notes, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, '', '', ?, ?, 'pending')`,
          [customerId, cleanName, cleanPhone, nowIso, nowIso]
        );
      }

      await db.runAsync(
        `INSERT INTO orders (
          id, order_code, customer_id, customer_name, customer_phone,
          total_weight_kg, subtotal, discount_amount, total_amount, paid_amount,
          payment_status, payment_method, status, estimated_done_at, notes,
          created_at, updated_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          orderId,
          orderCode,
          customerId,
          cleanName,
          cleanPhone,
          totalWeightKg,
          subtotal,
          discount,
          totalAmount,
          paidAmount,
          payStatus,
          payMethod,
          orderStatus,
          estDone,
          input.notes || '',
          nowIso,
          nowIso,
        ]
      );

      for (const item of builtItems) {
        await db.runAsync(
          `INSERT INTO order_items (id, order_id, service_id, service_name, unit, qty, price_per_unit, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.id,
            item.order_id,
            item.service_id,
            item.service_name,
            item.unit,
            item.qty,
            item.price_per_unit,
            item.subtotal,
          ]
        );
      }

      if (paidAmount > 0) {
        const categoryLabel = 'Pendapatan Jasa Laundry';
        const txTitle = `Cucian ${cleanName} (${orderCode})`;
        await db.runAsync(
          `INSERT INTO transactions (
            id, type, amount, title, category, payment_method,
            transaction_date, notes, proof_uri, order_id,
            created_at, updated_at, sync_status
          ) VALUES (?, 'income', ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, 'pending')`,
          [
            generateId(),
            paidAmount,
            txTitle,
            categoryLabel,
            payMethod,
            nowIso,
            input.notes || `${totalWeightKg > 0 ? `${totalWeightKg} kg` : 'Laundry'}`,
            orderId,
            nowIso,
            nowIso,
          ]
        );
      }
    });

    return {
      id: orderId,
      order_code: orderCode,
      customer_id: customerId,
      customer_name: cleanName,
      customer_phone: cleanPhone,
      total_weight_kg: totalWeightKg,
      subtotal,
      discount_amount: discount,
      total_amount: totalAmount,
      paid_amount: paidAmount,
      payment_status: payStatus,
      payment_method: payMethod,
      status: orderStatus,
      estimated_done_at: estDone,
      notes: input.notes || '',
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
      version: 1,
      sync_status: 'pending',
      items: builtItems,
    };
  },

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDb();
    await db.runAsync(
      "UPDATE orders SET status = ?, updated_at = ?, version = version + 1, sync_status = 'pending' WHERE id = ?",
      [status, now, orderId]
    );
  },

  async settleOrderPayment(
    orderId: string,
    paymentMethod: PaymentMethod = 'Tunai'
  ): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDb();
    const order = await db.getFirstAsync<LaundryOrder>(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );
    if (!order) return;

    const remaining = Math.max(0, order.total_amount - order.paid_amount);
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE orders
         SET paid_amount = total_amount, payment_status = 'lunas', payment_method = ?,
             updated_at = ?, version = version + 1, sync_status = 'pending'
         WHERE id = ?`,
        [paymentMethod, now, orderId]
      );

      if (remaining > 0) {
        await db.runAsync(
          `INSERT INTO transactions (
            id, type, amount, title, category, payment_method,
            transaction_date, notes, proof_uri, order_id,
            created_at, updated_at, sync_status
          ) VALUES (?, 'income', ?, ?, 'Pelunasan Piutang', ?, ?, 'Pelunasan cucian', NULL, ?, ?, ?, 'pending')`,
          [
            generateId(),
            remaining,
            `Pelunasan ${order.customer_name} (${order.order_code})`,
            paymentMethod,
            now,
            orderId,
            now,
            now,
          ]
        );
      }
    });
  },

  async deleteOrder(orderId: string): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        "UPDATE orders SET deleted_at = ?, updated_at = ?, version = version + 1, sync_status = 'pending' WHERE id = ?",
        [now, now, orderId]
      );
      await db.runAsync(
        "UPDATE transactions SET deleted_at = ?, updated_at = ?, version = version + 1, sync_status = 'pending' WHERE order_id = ? AND deleted_at IS NULL",
        [now, now, orderId]
      );
    });
  },

  async getTransactions(): Promise<CashTransaction[]> {
    const db = await getDb();
    return await db.getAllAsync<CashTransaction>(
      'SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY transaction_date DESC, created_at DESC'
    );
  },

  async addTransaction(input: {
    type: TransactionType;
    amount: number;
    title: string;
    category: string;
    paymentMethod: PaymentMethod;
    transactionDate?: string;
    notes?: string;
    proofUri?: string | null;
  }): Promise<CashTransaction> {
    const now = new Date().toISOString();
    const txDate = input.transactionDate || now;
    const id = generateId();
    const record: CashTransaction = {
      id,
      type: input.type,
      amount: Math.round(input.amount),
      title: input.title.trim(),
      category: input.category.trim(),
      payment_method: input.paymentMethod,
      transaction_date: txDate,
      notes: (input.notes || '').trim(),
      proof_uri: input.proofUri || null,
      order_id: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      version: 1,
      sync_status: 'pending',
    };

    const db = await getDb();
    await db.runAsync(
      `INSERT INTO transactions (
        id, type, amount, title, category, payment_method,
        transaction_date, notes, proof_uri, order_id,
        created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 'pending')`,
      [
        record.id,
        record.type,
        record.amount,
        record.title,
        record.category,
        record.payment_method,
        record.transaction_date,
        record.notes,
        record.proof_uri,
        record.created_at,
        record.updated_at,
      ]
    );
    return record;
  },

  async deleteTransaction(id: string): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDb();
    await db.runAsync(
      "UPDATE transactions SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?",
      [now, now, id]
    );
  },

  /**
   * Resets all transactional & master data back to a clean slate:
   * - Empties orders, order_items, transactions, customers, promos
   * - Resets services to 1 default package ("Cuci Kiloan", Rp7.000/kg or current defaultPricePerKg)
   */
  async resetAllData(): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDb();
    const currentSettings = await this.getSettings();
    const basePrice = currentSettings.defaultPricePerKg || 7000;

    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        DELETE FROM order_items;
        DELETE FROM orders;
        DELETE FROM transactions;
        DELETE FROM customers;
        DELETE FROM promos;
        DELETE FROM services;
      `);

      await db.runAsync(
        `INSERT INTO services (id, name, category, unit, price, duration_hours, is_default, created_at, updated_at, sync_status)
         VALUES (?, 'Cuci Kiloan', 'kiloan', 'kg', ?, 48, 1, ?, ?, 'pending')`,
        [generateId(), basePrice, now, now]
      );
    });
  },

  async exportBackupJson(): Promise<string> {
    const [settings, customers, services, promos, orders, transactions] = await Promise.all([
      this.getSettings(),
      this.getCustomers(),
      this.getServices(),
      this.getPromos(),
      this.getOrders(),
      this.getTransactions(),
    ]);
    return JSON.stringify(
      {
        app: 'CaNdry',
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        settings,
        customers,
        services,
        promos,
        orders,
        transactions,
      },
      null,
      2
    );
  },

  async restoreBackupJson(rawJson: string): Promise<void> {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.transactions)) {
      throw new Error('Format file backup CaNdry tidak valid.');
    }

    const db = await getDb();
    if (parsed.settings) {
      await this.updateSettings(parsed.settings);
    }

    await db.withTransactionAsync(async () => {
      if (Array.isArray(parsed.customers)) {
        for (const c of parsed.customers as Customer[]) {
          await db.runAsync(
            `INSERT OR REPLACE INTO customers (id, name, phone, address, notes, created_at, updated_at, deleted_at, version, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
              c.id,
              c.name,
              c.phone || '',
              c.address || '',
              c.notes || '',
              c.created_at,
              c.updated_at,
              c.deleted_at || null,
              c.version || 1,
            ]
          );
        }
      }

      if (Array.isArray(parsed.services)) {
        for (const s of parsed.services as LaundryService[]) {
          await db.runAsync(
            `INSERT OR REPLACE INTO services (id, name, category, unit, price, duration_hours, is_default, created_at, updated_at, deleted_at, version, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
              s.id,
              s.name,
              s.category,
              s.unit,
              s.price,
              s.duration_hours || 48,
              s.is_default || 0,
              s.created_at,
              s.updated_at,
              s.deleted_at || null,
              s.version || 1,
            ]
          );
        }
      }

      if (Array.isArray(parsed.promos)) {
        for (const p of parsed.promos as Promo[]) {
          await db.runAsync(
            `INSERT OR REPLACE INTO promos (id, code, name, discount_type, discount_value, is_active, created_at, updated_at, deleted_at, version, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
              p.id,
              p.code,
              p.name,
              p.discount_type,
              p.discount_value,
              p.is_active ?? 1,
              p.created_at,
              p.updated_at,
              p.deleted_at || null,
              p.version || 1,
            ]
          );
        }
      }

      if (Array.isArray(parsed.orders)) {
        for (const o of parsed.orders as LaundryOrder[]) {
          await db.runAsync(
            `INSERT OR REPLACE INTO orders (
              id, order_code, customer_id, customer_name, customer_phone,
              total_weight_kg, subtotal, discount_amount, total_amount, paid_amount,
              payment_status, payment_method, status, estimated_done_at, notes,
              created_at, updated_at, deleted_at, version, sync_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
              o.id,
              o.order_code,
              o.customer_id || null,
              o.customer_name,
              o.customer_phone || '',
              o.total_weight_kg || 0,
              o.subtotal || 0,
              o.discount_amount || 0,
              o.total_amount || 0,
              o.paid_amount || 0,
              o.payment_status || 'lunas',
              o.payment_method || 'Tunai',
              o.status || 'diterima',
              o.estimated_done_at,
              o.notes || '',
              o.created_at,
              o.updated_at,
              o.deleted_at || null,
              o.version || 1,
            ]
          );

          if (Array.isArray(o.items)) {
            await db.runAsync('DELETE FROM order_items WHERE order_id = ?', [o.id]);
            for (const it of o.items) {
              await db.runAsync(
                `INSERT INTO order_items (id, order_id, service_id, service_name, unit, qty, price_per_unit, subtotal)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  it.id,
                  o.id,
                  it.service_id || null,
                  it.service_name,
                  it.unit,
                  it.qty,
                  it.price_per_unit,
                  it.subtotal,
                ]
              );
            }
          }
        }
      }

      if (Array.isArray(parsed.transactions)) {
        for (const t of parsed.transactions as CashTransaction[]) {
          await db.runAsync(
            `INSERT OR REPLACE INTO transactions (id, type, amount, title, category, payment_method, transaction_date, notes, proof_uri, order_id, created_at, updated_at, deleted_at, version, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
              t.id,
              t.type,
              t.amount,
              t.title,
              t.category,
              t.payment_method,
              t.transaction_date,
              t.notes || '',
              t.proof_uri || null,
              t.order_id || null,
              t.created_at,
              t.updated_at,
              t.deleted_at || null,
              t.version || 1,
            ]
          );
        }
      }
    });
  },
};
