import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DualBarChart, DualBarDatum } from '../../components/DualBarChart';
import { MonthPickerTrigger } from '../../components/MonthPickerModal';
import { ScreenHeader } from '../../components/ui';
import {
  formatDateLong,
  formatMonthYear,
  formatRupiah,
  getMonthShortName,
  localYearMonthOf,
  localYearOf,
  toLocalDateKey,
} from '../../lib/format';
import { exportReportPdf } from '../../lib/receipt';
import { useAppStore } from '../../store/useAppStore';
import { colors, radius, shadows, spacing, type } from '../../theme/tokens';

type ReportGranularity = 'harian' | 'bulanan' | 'tahunan';

export default function ReportsScreen() {
  const transactions = useAppStore((s) => s.transactions);
  const selectedYearMonth = useAppStore((s) => s.selectedYearMonth);
  const setSelectedYearMonth = useAppStore((s) => s.setSelectedYearMonth);
  const settings = useAppStore((s) => s.settings);

  const [granularity, setGranularity] = useState<ReportGranularity>('bulanan');

  const todayKey = useMemo(() => toLocalDateKey(new Date()), []);
  const selectedYear = useMemo(
    () => selectedYearMonth.split('-')[0] || String(new Date().getFullYear()),
    [selectedYearMonth]
  );

  const scopedTransactions = useMemo(() => {
    if (granularity === 'harian') {
      return transactions.filter(
        (t) => toLocalDateKey(t.transaction_date) === todayKey
      );
    }
    if (granularity === 'tahunan') {
      return transactions.filter(
        (t) => localYearOf(t.transaction_date) === selectedYear
      );
    }
    return transactions.filter(
      (t) => localYearMonthOf(t.transaction_date) === selectedYearMonth
    );
  }, [transactions, granularity, todayKey, selectedYear, selectedYearMonth]);

  const { totalIncome, totalExpense, netCashflow } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const t of scopedTransactions) {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    }
    return {
      totalIncome: inc,
      totalExpense: exp,
      netCashflow: inc - exp,
    };
  }, [scopedTransactions]);

  const { comparisonData, chartSubtitle } = useMemo(() => {
    const [, m] = selectedYearMonth.split('-').map(Number);
    const shortM = getMonthShortName((m || 1) - 1);

    if (granularity === 'bulanan') {
      const buckets: DualBarDatum[] = [
        { label: `1–7 ${shortM}`, income: 0, expense: 0 },
        { label: `8–14 ${shortM}`, income: 0, expense: 0 },
        { label: `15–21 ${shortM}`, income: 0, expense: 0 },
        { label: `22+ ${shortM}`, income: 0, expense: 0 },
      ];
      for (const tx of scopedTransactions) {
        const d = new Date(tx.transaction_date).getDate();
        const idx = d <= 7 ? 0 : d <= 14 ? 1 : d <= 21 ? 2 : 3;
        if (tx.type === 'income') buckets[idx].income += tx.amount;
        else buckets[idx].expense += tx.amount;
      }
      return {
        comparisonData: buckets,
        chartSubtitle: formatMonthYear(selectedYearMonth),
      };
    }

    if (granularity === 'tahunan') {
      const buckets: DualBarDatum[] = [
        { label: 'Q1', income: 0, expense: 0 },
        { label: 'Q2', income: 0, expense: 0 },
        { label: 'Q3', income: 0, expense: 0 },
        { label: 'Q4', income: 0, expense: 0 },
      ];
      for (const tx of scopedTransactions) {
        const mIdx = new Date(tx.transaction_date).getMonth();
        const q = Math.floor(mIdx / 3);
        if (tx.type === 'income') buckets[q].income += tx.amount;
        else buckets[q].expense += tx.amount;
      }
      return {
        comparisonData: buckets,
        chartSubtitle: `Tahun ${selectedYear}`,
      };
    }

    const buckets: DualBarDatum[] = [
      { label: 'Pagi', income: 0, expense: 0 },
      { label: 'Siang', income: 0, expense: 0 },
      { label: 'Sore/Malam', income: 0, expense: 0 },
    ];
    for (const tx of scopedTransactions) {
      const hr = new Date(tx.transaction_date).getHours();
      const idx = hr < 12 ? 0 : hr < 16 ? 1 : 2;
      if (tx.type === 'income') buckets[idx].income += tx.amount;
      else buckets[idx].expense += tx.amount;
    }
    return {
      comparisonData: buckets,
      chartSubtitle: formatDateLong(new Date()),
    };
  }, [granularity, scopedTransactions, selectedYearMonth, selectedYear]);

  const incomeByCategory = useMemo(() => {
    const map = new Map<string, number>();
    let sum = 0;
    for (const tx of scopedTransactions) {
      if (tx.type === 'income') {
        sum += tx.amount;
        map.set(tx.category, (map.get(tx.category) || 0) + tx.amount);
      }
    }
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: sum > 0 ? Math.round((amount / sum) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [scopedTransactions]);

  const expenseByCategory = useMemo(() => {
    const map = new Map<string, number>();
    let sum = 0;
    for (const tx of scopedTransactions) {
      if (tx.type === 'expense') {
        sum += tx.amount;
        map.set(tx.category, (map.get(tx.category) || 0) + tx.amount);
      }
    }
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: sum > 0 ? Math.round((amount / sum) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [scopedTransactions]);

  const periodTitle = useMemo(() => {
    if (granularity === 'harian') return formatDateLong(new Date());
    if (granularity === 'tahunan') return `Tahun ${selectedYear}`;
    return formatMonthYear(selectedYearMonth);
  }, [granularity, selectedYear, selectedYearMonth]);

  const handleDownloadReport = () => {
    exportReportPdf({
      periodTitle,
      settings,
      totalIncome,
      totalExpense,
      netCashflow,
      categoryBreakdown: incomeByCategory,
      transactions: scopedTransactions,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Laporan"
        subtitle={`Periode ${periodTitle}`}
        icon="stats-chart-outline"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.granularityRow}>
          {(
            [
              { key: 'harian', label: 'Harian' },
              { key: 'bulanan', label: 'Bulanan' },
              { key: 'tahunan', label: 'Tahunan' },
            ] as const
          ).map((g) => {
            const active = granularity === g.key;
            return (
              <TouchableOpacity
                key={g.key}
                style={[styles.granPill, active && styles.granPillActive]}
                onPress={() => setGranularity(g.key)}
              >
                <Text
                  style={[
                    styles.granPillText,
                    active && styles.granPillTextActive,
                  ]}
                >
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginBottom: spacing.md }}>
          <MonthPickerTrigger
            value={selectedYearMonth}
            onChange={setSelectedYearMonth}
            showCalendarIcon
            variant="full"
          />
        </View>

        {/* Net Cashflow Hero Card */}
        <View style={styles.netCard}>
          <View style={styles.netOrb} />
          <View style={styles.netTopRow}>
            <View style={styles.netIconBadge}>
              <Ionicons
                name="trending-up-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <Text style={styles.netLabel}>Arus kas bersih ({periodTitle})</Text>
          </View>
          <Text
            style={[
              styles.netAmount,
              netCashflow < 0 && { color: colors.expense },
            ]}
          >
            {formatRupiah(netCashflow, { showPlus: true })}
          </Text>
        </View>

        <View style={styles.twoColRow}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: colors.incomeBg }]}>
                <Ionicons name="arrow-down" size={15} color={colors.income} />
              </View>
              <Text style={styles.statLabel}>Pemasukan</Text>
            </View>
            <Text style={[styles.statAmount, { color: colors.income }]}>
              {formatRupiah(totalIncome)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: colors.expenseBg }]}>
                <Ionicons name="arrow-up" size={15} color={colors.expense} />
              </View>
              <Text style={styles.statLabel}>Pengeluaran</Text>
            </View>
            <Text style={[styles.statAmount, { color: colors.expense }]}>
              {formatRupiah(totalExpense)}
            </Text>
          </View>
        </View>

        <View style={{ marginBottom: spacing.lg }}>
          <DualBarChart
            title="Perbandingan arus kas"
            subtitle={chartSubtitle}
            data={comparisonData}
            legendPosition="bottom"
            incomeLegendLabel="Pemasukan"
            expenseLegendLabel="Pengeluaran"
          />
        </View>

        {/* Pemasukan per kategori inside a styled card */}
        <View style={styles.categoryCard}>
          <View style={styles.categoryCardHeader}>
            <View style={[styles.statIcon, { backgroundColor: colors.incomeBg }]}>
              <Ionicons name="pie-chart-outline" size={15} color={colors.income} />
            </View>
            <Text style={styles.sectionTitle}>Pemasukan per kategori</Text>
          </View>

          <View style={styles.categoryList}>
            {incomeByCategory.map((item) => (
              <View key={item.category} style={styles.categoryBlock}>
                <View style={styles.categoryTopRow}>
                  <Text style={styles.categoryName}>{item.category}</Text>
                  <Text style={styles.categoryValue}>
                    {formatRupiah(item.amount)} · {item.percentage}%
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(4, item.percentage)}%` },
                    ]}
                  />
                </View>
              </View>
            ))}

            {incomeByCategory.length === 0 && (
              <Text style={styles.emptyCategoryText}>
                Belum ada pemasukan pada periode ini.
              </Text>
            )}
          </View>
        </View>

        {expenseByCategory.length > 0 && (
          <View style={[styles.categoryCard, { marginTop: spacing.md }]}>
            <View style={styles.categoryCardHeader}>
              <View style={[styles.statIcon, { backgroundColor: colors.expenseBg }]}>
                <Ionicons name="pie-chart-outline" size={15} color={colors.expense} />
              </View>
              <Text style={styles.sectionTitle}>Pengeluaran per kategori</Text>
            </View>

            <View style={styles.categoryList}>
              {expenseByCategory.map((item) => (
                <View key={item.category} style={styles.categoryBlock}>
                  <View style={styles.categoryTopRow}>
                    <Text style={styles.categoryName}>{item.category}</Text>
                    <Text style={styles.categoryValue}>
                      {formatRupiah(item.amount)} · {item.percentage}%
                    </Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.max(4, item.percentage)}%`,
                          backgroundColor: colors.expenseChart,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.downloadButton}
          onPress={handleDownloadReport}
        >
          <Ionicons name="download-outline" size={18} color="#FFFFFF" />
          <Text style={styles.downloadButtonText}>Unduh laporan PDF</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 40,
  },
  granularityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  granPill: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBF0F7',
    ...shadows.card,
  },
  granPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  granPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  granPillTextActive: {
    color: '#FFFFFF',
  },
  netCard: {
    backgroundColor: '#E8EFFC',
    borderRadius: radius.xxl,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#D5E3FC',
    overflow: 'hidden',
  },
  netOrb: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(35, 88, 208, 0.08)',
    top: -30,
    right: -25,
  },
  netTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  netIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  netLabel: {
    ...type.label,
    color: colors.textSecondary,
  },
  netAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 8,
    letterSpacing: -0.5,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#EBF0F7',
    ...shadows.card,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
  statAmount: {
    fontSize: 17,
    fontWeight: '800',
  },
  categoryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#EBF0F7',
    ...shadows.card,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...type.section,
    color: colors.textPrimary,
  },
  categoryList: {
    gap: 14,
  },
  categoryBlock: {
    gap: 6,
  },
  categoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#EBF1FA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 7,
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  emptyCategoryText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  downloadButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.elevated,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
