import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatCompactRupiah } from '../lib/format';
import { colors, radius, shadows, spacing, type } from '../theme/tokens';

export interface DualBarDatum {
  label: string;
  income: number;
  expense: number;
}

interface DualBarChartProps {
  title: string;
  subtitle?: string;
  data: DualBarDatum[];
  footerLabel?: string;
  legendPosition?: 'top-right' | 'bottom';
  incomeLegendLabel?: string;
  expenseLegendLabel?: string;
}

/** Rounds up to 1, 2 or 5 × 10^n so axis labels stay readable. */
export function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / magnitude;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * magnitude;
}

export function DualBarChart({
  title,
  subtitle,
  data,
  footerLabel,
  legendPosition = 'top-right',
  incomeLegendLabel = 'Masuk',
  expenseLegendLabel = 'Keluar',
}: DualBarChartProps) {
  const dataMax = Math.max(0, ...data.map((d) => Math.max(d.income, d.expense)));
  const computedMax = niceCeil(dataMax) || 100_000;
  const yAxisLabels = [
    formatCompactRupiah(computedMax),
    formatCompactRupiah(computedMax / 2),
    '0',
  ];

  const chartHeight = 112;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {legendPosition === 'top-right' && (
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.incomeChart }]} />
              <Text style={styles.legendText}>{incomeLegendLabel}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.expenseChart }]} />
              <Text style={styles.legendText}>{expenseLegendLabel}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.chartBody}>
        {/* Y-Axis Labels */}
        <View style={[styles.yAxis, { height: chartHeight }]}>
          {yAxisLabels.map((lbl, idx) => (
            <Text key={idx} style={styles.yAxisText}>
              {lbl}
            </Text>
          ))}
        </View>

        {/* Grid & Bars */}
        <View style={styles.plotArea}>
          {/* Horizontal grid lines */}
          <View style={[styles.gridContainer, { height: chartHeight }]}>
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
          </View>

          {/* Bar columns */}
          <View style={[styles.barsRow, { height: chartHeight }]}>
            {data.map((item, i) => {
              const incRatio = Math.min(1, Math.max(0, item.income / computedMax));
              const expRatio = Math.min(1, Math.max(0, item.expense / computedMax));
              const incHeight = item.income > 0 ? Math.max(8, Math.round(incRatio * (chartHeight - 10))) : 3;
              const expHeight = item.expense > 0 ? Math.max(6, Math.round(expRatio * (chartHeight - 10))) : 3;

              return (
                <View key={i} style={styles.barGroupWrap}>
                  <View style={styles.barPair}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: incHeight,
                          backgroundColor: colors.incomeChart,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.bar,
                        {
                          height: expHeight,
                          backgroundColor: colors.expenseChart,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>

          {/* X-Axis Labels */}
          <View style={styles.xAxisRow}>
            {data.map((item, i) => (
              <View key={i} style={styles.xAxisCell}>
                <Text style={styles.xAxisText} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          {footerLabel ? <Text style={styles.footerLabel}>{footerLabel}</Text> : null}
        </View>
      </View>

      {legendPosition === 'bottom' && (
        <View style={[styles.legendRow, { justifyContent: 'center', marginTop: spacing.md, gap: 28 }]}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.incomeChart }]} />
            <Text style={styles.legendText}>{incomeLegendLabel}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.expenseChart }]} />
            <Text style={styles.legendText}>{expenseLegendLabel}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...type.section,
    color: colors.textPrimary,
  },
  subtitle: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chartBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  yAxis: {
    width: 34,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  yAxisText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  plotArea: {
    flex: 1,
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  gridLine: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  barGroupWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barPair: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  bar: {
    width: 11,
    borderRadius: 4,
  },
  xAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  xAxisCell: {
    flex: 1,
    alignItems: 'center',
  },
  xAxisText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  footerLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
    paddingRight: 8,
  },
});
