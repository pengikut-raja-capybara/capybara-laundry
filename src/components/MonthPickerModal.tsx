import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatMonthYear, getMonthShortName } from '../lib/format';
import { colors, radius, shadows, spacing, type } from '../theme/tokens';

interface MonthPickerTriggerProps {
  value: string; // "YYYY-MM"
  onChange: (ym: string) => void;
  showCalendarIcon?: boolean;
  variant?: 'pill' | 'full' | 'header';
}

const MONTHS_INDEX = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function formatMonthYearCompact(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${getMonthShortName(m - 1)} ${y}`;
}

export function MonthPickerTrigger({
  value,
  onChange,
  showCalendarIcon = false,
  variant = 'pill',
}: MonthPickerTriggerProps) {
  const [visible, setVisible] = useState(false);

  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 5;
  const maxYear = currentYear + 10;

  const [parsedYear, parsedMonth] = value.split('-').map(Number);
  const [pickerYear, setPickerYear] = useState<number>(parsedYear || currentYear);

  const openPicker = () => {
    const [y] = value.split('-').map(Number);
    setPickerYear(y || currentYear);
    setVisible(true);
  };

  const isHeader = variant === 'header';
  const displayLabel = isHeader
    ? formatMonthYearCompact(value)
    : formatMonthYear(value);

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={openPicker}
        style={[
          styles.trigger,
          variant === 'full' && styles.triggerFull,
          isHeader && styles.triggerHeader,
        ]}
      >
        <View style={styles.leftRow}>
          {(showCalendarIcon || isHeader) && (
            <Ionicons
              name="calendar-outline"
              size={isHeader ? 15 : 18}
              color={colors.primary}
              style={{ marginRight: 6 }}
            />
          )}
          <Text
            style={[
              styles.triggerText,
              isHeader && styles.triggerTextHeader,
            ]}
            numberOfLines={1}
          >
            {displayLabel}
          </Text>
        </View>
        <Ionicons
          name="chevron-down"
          size={isHeader ? 14 : 16}
          color={isHeader ? colors.primary : colors.textPrimary}
        />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {/* Year Selector Header */}
            <View style={styles.yearRow}>
              <TouchableOpacity
                style={styles.yearArrow}
                disabled={pickerYear <= minYear}
                onPress={() => setPickerYear((y) => Math.max(minYear, y - 1))}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={pickerYear <= minYear ? colors.textMuted : colors.textPrimary}
                />
              </TouchableOpacity>

              <Text style={styles.yearTitle}>{pickerYear}</Text>

              <TouchableOpacity
                style={styles.yearArrow}
                disabled={pickerYear >= maxYear}
                onPress={() => setPickerYear((y) => Math.min(maxYear, y + 1))}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={pickerYear >= maxYear ? colors.textMuted : colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            {/* 12-Month Grid (3 columns x 4 rows) */}
            <View style={styles.monthGrid}>
              {MONTHS_INDEX.map((mIdx) => {
                const mNum = mIdx + 1;
                const ym = `${pickerYear}-${String(mNum).padStart(2, '0')}`;
                const active = pickerYear === parsedYear && mNum === parsedMonth;

                return (
                  <TouchableOpacity
                    key={mIdx}
                    style={[styles.monthCell, active && styles.monthCellActive]}
                    onPress={() => {
                      onChange(ym);
                      setVisible(false);
                    }}
                  >
                    <Text style={[styles.monthText, active && styles.monthTextActive]}>
                      {getMonthShortName(mIdx)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  triggerHeader: {
    backgroundColor: colors.primarySoft,
    borderColor: '#D4E2FC',
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowOpacity: 0,
    elevation: 0,
  },
  triggerFull: {
    width: '100%',
    alignSelf: 'stretch',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  triggerText: {
    ...type.label,
    color: colors.textPrimary,
  },
  triggerTextHeader: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.elevated,
  },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  yearArrow: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearTitle: {
    ...type.section,
    fontSize: 19,
    color: colors.textPrimary,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthCell: {
    width: '31%',
    paddingVertical: 13,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCellActive: {
    backgroundColor: colors.primary,
  },
  monthText: {
    ...type.label,
    color: colors.textPrimary,
  },
  monthTextActive: {
    color: '#FFFFFF',
  },
});
