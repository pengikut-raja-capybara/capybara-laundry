import { create } from 'zustand';
import {
  BusinessSettings,
  CashTransaction,
  Customer,
  LaundryOrder,
  LaundryService,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Promo,
  ServiceCategoryType,
  ServiceUnit,
  TransactionType,
} from '../db/database';
import { toYearMonth } from '../lib/format';
import {
  clearAuthSession,
  extendAuthSession,
  isAppOnboarded,
  isAuthSessionValid,
} from '../lib/security';
import { PosRepository } from '../repositories/posRepository';

interface AppState {
  isReady: boolean;
  isOnboarded: boolean;
  isAuthenticated: boolean;
  selectedYearMonth: string; // e.g. "2026-11"
  settings: BusinessSettings;
  customers: Customer[];
  services: LaundryService[];
  promos: Promo[];
  orders: LaundryOrder[];
  transactions: CashTransaction[];

  bootstrap: () => Promise<void>;
  refreshAll: () => Promise<void>;
  setSelectedYearMonth: (ym: string) => void;
  setAuthenticated: (auth: boolean) => void;
  setOnboarded: (onboarded: boolean) => void;

  // Actions
  updateBusinessSettings: (partial: Partial<BusinessSettings>) => Promise<void>;
  createLaundryOrder: (input: {
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
  }) => Promise<LaundryOrder>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  settleOrderPayment: (orderId: string, method?: PaymentMethod) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;

  addCashTransaction: (input: {
    type: TransactionType;
    amount: number;
    title: string;
    category: string;
    paymentMethod: PaymentMethod;
    transactionDate?: string;
    notes?: string;
    proofUri?: string | null;
  }) => Promise<CashTransaction>;
  deleteCashTransaction: (id: string) => Promise<void>;

  saveService: (input: {
    id?: string;
    name: string;
    category: ServiceCategoryType;
    unit: ServiceUnit;
    price: number;
    duration_hours: number;
    is_default?: number;
  }) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  saveCustomer: (input: {
    id?: string;
    name: string;
    phone?: string;
    address?: string;
    notes?: string;
  }) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;

  savePromo: (input: {
    id?: string;
    code: string;
    name: string;
    discount_type: 'percent' | 'nominal';
    discount_value: number;
  }) => Promise<void>;
  deletePromo: (id: string) => Promise<void>;
  resetAllData: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isReady: false,
  isOnboarded: false,
  isAuthenticated: false,
  selectedYearMonth: toYearMonth(new Date()),
  settings: {
    shopName: 'CaNdry Laundry',
    tagline: 'Capybara Laundry • Bersih, Rapi, Wangi',
    phone: '0812-3456-7890',
    address: 'Jl. Melati No. 12, Jakarta',
    defaultPricePerKg: 7000,
    initialCashBalance: 0,
    receiptFooter: 'Terima kasih telah mencuci di CaNdry! Cucian bersih, hati tenang.',
  },
  customers: [],
  services: [],
  promos: [],
  orders: [],
  transactions: [],

  bootstrap: async () => {
    await PosRepository.init();
    const onboarded = await isAppOnboarded();
    const sessionValid = onboarded ? await isAuthSessionValid() : false;
    const [settings, customers, services, promos, orders, transactions] = await Promise.all([
      PosRepository.getSettings(),
      PosRepository.getCustomers(),
      PosRepository.getServices(),
      PosRepository.getPromos(),
      PosRepository.getOrders(),
      PosRepository.getTransactions(),
    ]);
    set({
      isReady: true,
      isOnboarded: onboarded,
      isAuthenticated: sessionValid,
      settings,
      customers,
      services,
      promos,
      orders,
      transactions,
    });
  },

  refreshAll: async () => {
    const [settings, customers, services, promos, orders, transactions] = await Promise.all([
      PosRepository.getSettings(),
      PosRepository.getCustomers(),
      PosRepository.getServices(),
      PosRepository.getPromos(),
      PosRepository.getOrders(),
      PosRepository.getTransactions(),
    ]);
    set({
      settings,
      customers,
      services,
      promos,
      orders,
      transactions,
    });
  },

  setSelectedYearMonth: (ym) => set({ selectedYearMonth: ym }),
  setAuthenticated: (auth) => {
    set({ isAuthenticated: auth });
    if (auth) {
      extendAuthSession();
    } else {
      clearAuthSession();
    }
  },
  setOnboarded: (onboarded) => set({ isOnboarded: onboarded }),

  updateBusinessSettings: async (partial) => {
    await PosRepository.updateSettings(partial);
    await get().refreshAll();
  },

  createLaundryOrder: async (input) => {
    const order = await PosRepository.createOrder(input);
    await get().refreshAll();
    return order;
  },

  updateOrderStatus: async (orderId, status) => {
    await PosRepository.updateOrderStatus(orderId, status);
    await get().refreshAll();
  },

  settleOrderPayment: async (orderId, method = 'Tunai') => {
    await PosRepository.settleOrderPayment(orderId, method);
    await get().refreshAll();
  },

  deleteOrder: async (orderId) => {
    await PosRepository.deleteOrder(orderId);
    await get().refreshAll();
  },

  addCashTransaction: async (input) => {
    const tx = await PosRepository.addTransaction(input);
    await get().refreshAll();
    return tx;
  },

  deleteCashTransaction: async (id) => {
    await PosRepository.deleteTransaction(id);
    await get().refreshAll();
  },

  saveService: async (input) => {
    await PosRepository.saveService(input);
    await get().refreshAll();
  },

  deleteService: async (id) => {
    await PosRepository.deleteService(id);
    await get().refreshAll();
  },

  saveCustomer: async (input) => {
    const c = await PosRepository.saveCustomer(input);
    await get().refreshAll();
    return c;
  },

  deleteCustomer: async (id) => {
    await PosRepository.deleteCustomer(id);
    await get().refreshAll();
  },

  savePromo: async (input) => {
    await PosRepository.savePromo(input);
    await get().refreshAll();
  },

  deletePromo: async (id) => {
    await PosRepository.deletePromo(id);
    await get().refreshAll();
  },

  resetAllData: async () => {
    await PosRepository.resetAllData();
    await get().refreshAll();
  },
}));
