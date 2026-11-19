export const colors = {
  // Brand Primary
  primary: '#2358D0',
  primaryDark: '#1A44A8',
  primaryLight: '#EBF1FF',
  primarySoft: '#F0F5FF',

  // Backgrounds & Surfaces
  background: '#F6F8FB',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',

  // Typography
  textPrimary: '#0F1C35',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Income / Success (Green)
  income: '#0D8A52',
  incomeChart: '#0E9F6E',
  incomeBg: '#E6F5EE',
  incomeBorder: '#B7E4CE',

  // Expense / Danger (Red / Rose)
  expense: '#A94442',
  expenseChart: '#D97B7D',
  expenseBg: '#FCECEE',
  expenseBorder: '#F5C6CB',

  // Warning / Pending (Amber)
  warning: '#B45309',
  warningBg: '#FEF3C7',
  warningBorder: '#FDE68A',

  // Info / Processing (Blue)
  info: '#1D4ED8',
  infoBg: '#DBEAFE',

  // Borders & Dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  overlay: 'rgba(15, 28, 53, 0.45)',
} as const;

export const fonts = {
  brand: 'Fredoka_700Bold',
  brandSemi: 'Fredoka_600SemiBold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
  bold: 'PlusJakartaSans_700Bold',
  semiBold: 'PlusJakartaSans_600SemiBold',
  medium: 'PlusJakartaSans_500Medium',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

/** Single type scale used by every screen. */
export const type = {
  display: {
    fontSize: 34,
    fontFamily: fonts.extraBold,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  section: {
    fontSize: 17,
    fontFamily: fonts.bold,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontFamily: fonts.medium,
    fontWeight: '500',
  },
  bodyStrong: {
    fontSize: 15,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    fontFamily: fonts.medium,
    fontWeight: '500',
  },
} as const;

export const shadows = {
  card: {
    shadowColor: '#0F1C35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#2358D0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
} as const;
