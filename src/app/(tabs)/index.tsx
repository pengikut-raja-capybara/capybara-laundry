import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandWordmark } from '../../components/BrandWordmark';
import { DualBarChart, DualBarDatum } from '../../components/DualBarChart';
import { Button, IconButton } from '../../components/ui';
import {
  formatDateShortWithTime,
  formatMonthYear,
  formatRupiah,
  localYearMonthOf,
  toLocalDateKey,
  toYearMonth,
} from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';
import { colors, radius, shadows, spacing, type } from '../../theme/tokens';

export default function HomeScreen() {
  const settings = useAppStore((s) => s.settings);
  const transactions = useAppStore((s) => s.transactions);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);

  const currentYearMonth = useMemo(() => toYearMonth(new Date()), []);

  const monthTransactions = useMemo(
    () =>
      transactions.filter(
        (t) => localYearMonthOf(t.transaction_date) === currentYearMonth
      ),
    [transactions, currentYearMonth]
  );

  const { income, expense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of monthTransactions) {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    }
    return { income: inc, expense: exp };
  }, [monthTransactions]);

  const balance = useMemo(() => {
    let total = settings.initialCashBalance || 0;
    for (const t of transactions) {
      total += t.type === 'income' ? t.amount : -t.amount;
    }
    return total;
  }, [transactions, settings.initialCashBalance]);

  const chartData = useMemo<DualBarDatum[]>(() => {
    const now = new Date();
    const lastDay = now.getDate();
    const firstDay = Math.max(1, lastDay - 6);

    const days: DualBarDatum[] = [];
    for (let d = firstDay; d <= lastDay; d++) {
      const key = `${currentYearMonth}-${String(d).padStart(2, '0')}`;
      let inc = 0;
      let exp = 0;
      for (const t of monthTransactions) {
        if (toLocalDateKey(t.transaction_date) !== key) continue;
        if (t.type === 'income') inc += t.amount;
        else exp += t.amount;
      }
      days.push({ label: String(d), income: inc, expense: exp });
    }
    return days;
  }, [monthTransactions, currentYearMonth]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Fixed Header with Mascot Avatar & Brand Wordmark (Tap to open Credits) */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          activeOpacity={0.75}
          style={styles.brandRow}
          onPress={() => router.push('/credits')}
          accessibilityLabel="Tentang CaNdry"
        >
          <View style={styles.miniMascotWrap}>
            <Image
              source={require('../../../assets/images/capybara-hero.jpg')}
              style={styles.miniMascotImg}
              resizeMode="cover"
            />
          </View>
          <View style={{ flex: 1 }}>
            <BrandWordmark size="sm" />
            {settings.shopName ? (
              <Text style={styles.shopSub} numberOfLines={1}>
                {settings.shopName}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>

        <IconButton
          icon="lock-closed-outline"
          accessibilityLabel="Kunci aplikasi"
          onPress={() => setAuthenticated(false)}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Balance Card with Decorative Orbs */}
        <View style={styles.balanceCard}>
          <View style={styles.heroOrbRight} />
          <View style={styles.heroOrbBottom} />

          <View style={styles.balanceTopRow}>
            <View style={styles.walletBadge}>
              <Ionicons name="wallet-outline" size={16} color="#FFFFFF" />
              <Text style={styles.balanceLabel}>Saldo kas aktif</Text>
            </View>
            <View style={styles.periodPill}>
              <Text style={styles.periodPillText}>
                {formatMonthYear(currentYearMonth)}
              </Text>
            </View>
          </View>

          <Text style={styles.balanceValue}>{formatRupiah(balance)}</Text>
          <Text style={styles.balanceSub}>
            Modal awal {formatRupiah(settings.initialCashBalance)}
          </Text>
        </View>

        {/* Dedicated Pemasukan & Pengeluaran Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.incomeBg }]}>
                <Ionicons name="arrow-down" size={16} color={colors.income} />
              </View>
              <Text style={styles.summaryLabel}>Pemasukan</Text>
            </View>
            <Text style={[styles.summaryValue, { color: colors.income }]}>
              {formatRupiah(income)}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.expenseBg }]}>
                <Ionicons name="arrow-up" size={16} color={colors.expense} />
              </View>
              <Text style={styles.summaryLabel}>Pengeluaran</Text>
            </View>
            <Text style={[styles.summaryValue, { color: colors.expense }]}>
              {formatRupiah(expense)}
            </Text>
          </View>
        </View>

        {/* Primary Quick Actions */}
        <View style={styles.actions}>
          <Button
            label="Tambah cucian"
            icon="add-circle-outline"
            onPress={() => router.push('/add-order')}
            style={styles.actionButton}
          />
          <Button
            label="Tambah transaksi"
            icon="swap-vertical"
            variant="secondary"
            onPress={() => router.push('/add-transaction')}
            style={styles.actionButton}
          />
        </View>

        {/* Chart */}
        <View style={styles.section}>
          <DualBarChart title="Grafik arus kas" data={chartData} />
        </View>

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transaksi terbaru</Text>
          {monthTransactions.length > 0 && (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/transactions')}
              hitSlop={8}
            >
              <Text style={styles.link}>Lihat semua</Text>
            </TouchableOpacity>
          )}
        </View>

        {monthTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name="receipt-outline"
                size={26}
                color={colors.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
            <Text style={styles.emptySub}>
              Mulai catat cucian pelanggan atau transaksi kas untuk bulan ini.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {monthTransactions.slice(0, 5).map((tx, idx, arr) => {
              const isIncome = tx.type === 'income';
              return (
                <View
                  key={tx.id}
                  style={[
                    styles.txRow,
                    idx < arr.length - 1 && styles.txDivider,
                  ]}
                >
                  <View
                    style={[
                      styles.txIcon,
                      {
                        backgroundColor: isIncome
                          ? colors.incomeBg
                          : colors.expenseBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isIncome ? 'arrow-down' : 'arrow-up'}
                      size={16}
                      color={isIncome ? colors.income : colors.expense}
                    />
                  </View>
                  <View style={styles.txBody}>
                    <Text style={styles.txTitle} numberOfLines={1}>
                      {tx.title}
                    </Text>
                    <Text style={styles.txMeta} numberOfLines={1}>
                      {tx.category} • {formatDateShortWithTime(tx.transaction_date)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: isIncome ? colors.income : colors.expense },
                    ]}
                  >
                    {isIncome
                      ? formatRupiah(tx.amount, { showPlus: true })
                      : formatRupiah(-tx.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  miniMascotWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D6E4FF',
  },
  miniMascotImg: {
    width: 40,
    height: 40,
  },
  shopSub: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: -2,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  balanceCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    overflow: 'hidden',
    ...shadows.elevated,
  },
  heroOrbRight: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -40,
    right: -35,
  },
  heroOrbBottom: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -45,
    left: 20,
  },
  balanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceLabel: {
    ...type.label,
    color: 'rgba(255,255,255,0.9)',
  },
  periodPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  periodPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  balanceValue: {
    ...type.display,
    color: '#FFFFFF',
    marginTop: spacing.sm,
  },
  balanceSub: {
    ...type.caption,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#EBF0F7',
    ...shadows.card,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
  summaryValue: {
    ...type.section,
    fontSize: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...type.section,
    color: colors.textPrimary,
  },
  link: {
    ...type.label,
    color: colors.primary,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBF0F7',
    ...shadows.card,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  emptySub: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#EBF0F7',
    ...shadows.card,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  txDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txBody: {
    flex: 1,
  },
  txTitle: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  txMeta: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txAmount: {
    ...type.bodyStrong,
  },
});
