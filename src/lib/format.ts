import * as Crypto from 'expo-crypto';

/**
 * Generates a time-ordered UUID v7-style identifier so records sort chronologically
 * and remain globally unique for future multi-device / cloud synchronization.
 */
export function generateId(): string {
  try {
    const random = Crypto.randomUUID();
    const nowHex = Date.now().toString(16).padStart(12, '0');
    // Replace first 12 hex characters (8 + 4) with timestamp for time-sortable UUID
    return `${nowHex.slice(0, 8)}-${nowHex.slice(8, 12)}-7${random.slice(15)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

/**
 * Format integer Rupiah amount: e.g. 8250000 -> "Rp8.250.000"
 */
export function formatRupiah(amount: number, options?: { showPlus?: boolean; showSign?: boolean }): string {
  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount || 0));
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (isNegative) {
    return `−Rp${formatted}`;
  }
  if (options?.showPlus && abs > 0) {
    return `+Rp${formatted}`;
  }
  return `Rp${formatted}`;
}

/**
 * Format compact Rupiah for chart axes: e.g. 2000000 -> "2 jt", 500000 -> "500 rb"
 */
export function formatCompactRupiah(amount: number): string {
  const abs = Math.abs(amount);
  if (abs === 0) return '0';
  if (abs >= 1_000_000) {
    const jt = abs / 1_000_000;
    return `${Number.isInteger(jt) ? jt : jt.toFixed(1).replace('.', ',')} jt`;
  }
  if (abs >= 1_000) {
    const rb = Math.round(abs / 1_000);
    return `${rb} rb`;
  }
  return `${abs}`;
}

/**
 * Parse digits string from TextInput into integer Rupiah
 */
export function parseRupiahInput(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) || 0;
}

/**
 * Format raw numeric string with thousand dots for live input: "750000" -> "750.000"
 */
export function formatDigitsWithDots(value: number | string): string {
  const num = typeof value === 'number' ? value : parseRupiahInput(value);
  if (!num) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const MONTHS_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const MONTHS_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/**
 * Format ISO date string or Date to "16 November 2026"
 */
export function formatDateLong(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format ISO date string or Date to "16 Nov 2026"
 */
export function formatDateMedium(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return `${d.getDate()} ${MONTHS_SHORT_ID[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format ISO date string or Date to "16 Nov, 10.30"
 */
export function formatDateShortWithTime(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return String(dateInput);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS_SHORT_ID[d.getMonth()]}, ${hh}.${mm}`;
}

/**
 * Format "YYYY-MM" into "November 2026"
 */
export function formatMonthYear(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  return `${MONTHS_ID[m - 1]} ${y}`;
}

export function getMonthShortName(monthIndex0: number): string {
  return MONTHS_SHORT_ID[monthIndex0] ?? '';
}

export function getMonthFullName(monthIndex0: number): string {
  return MONTHS_ID[monthIndex0] ?? '';
}

/**
 * Returns "YYYY-MM" for a given Date
 */
export function toYearMonth(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Returns "YYYY-MM-DD" in local time
 */
export function toLocalDateKey(dInput: string | Date = new Date()): string {
  const d = typeof dInput === 'string' ? new Date(dInput) : dInput;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Local-time "YYYY-MM" of an ISO timestamp (stored values are UTC). */
export function localYearMonthOf(iso: string): string {
  return toYearMonth(new Date(iso));
}

/** Local-time "YYYY" of an ISO timestamp. */
export function localYearOf(iso: string): string {
  return String(new Date(iso).getFullYear());
}
