import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { create } from 'zustand';
import { colors, fonts, radius, shadows, spacing, type } from '../theme/tokens';

export type DialogTone = 'success' | 'danger' | 'warning' | 'info';

export interface DialogAction {
  label: string;
  variant?: 'primary' | 'danger' | 'success' | 'secondary' | 'ghost';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void | Promise<void>;
}

export interface DialogConfig {
  tone?: DialogTone;
  title: string;
  message?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  actions?: DialogAction[];
}

interface DialogStore {
  visible: boolean;
  config: DialogConfig | null;
  show: (config: DialogConfig) => void;
  hide: () => void;
}

export const useDialogStore = create<DialogStore>((set) => ({
  visible: false,
  config: null,
  show: (config) => set({ visible: true, config }),
  hide: () => set({ visible: false, config: null }),
}));

export function showDialog(config: DialogConfig): void {
  useDialogStore.getState().show(config);
}

const TONE_THEME: Record<
  DialogTone,
  {
    bg: string;
    ring: string;
    color: string;
    defaultIcon: React.ComponentProps<typeof Ionicons>['name'];
  }
> = {
  success: {
    bg: colors.incomeBg,
    ring: '#D1FAE5',
    color: colors.income,
    defaultIcon: 'checkmark-circle',
  },
  danger: {
    bg: colors.expenseBg,
    ring: '#FEE2E2',
    color: colors.expense,
    defaultIcon: 'trash',
  },
  warning: {
    bg: colors.warningBg,
    ring: '#FEF3C7',
    color: colors.warning,
    defaultIcon: 'alert-circle',
  },
  info: {
    bg: colors.primaryLight,
    ring: '#DBEAFE',
    color: colors.primary,
    defaultIcon: 'information-circle',
  },
};

export function AppDialogHost() {
  const visible = useDialogStore((s) => s.visible);
  const config = useDialogStore((s) => s.config);
  const hide = useDialogStore((s) => s.hide);

  if (!visible || !config) return null;

  const tone = config.tone || 'info';
  const theme = TONE_THEME[tone];
  const iconName = config.icon || theme.defaultIcon;

  const actions: DialogAction[] =
    config.actions && config.actions.length > 0
      ? config.actions
      : [{ label: 'Mengerti', variant: 'primary' }];

  const isTwoButtons =
    actions.length === 2 &&
    actions.every((a) => a.label.length <= 16);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={hide}
    >
      <Pressable style={styles.backdrop} onPress={hide}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Decorative Top Accent Bar */}
          <View style={[styles.topAccentBar, { backgroundColor: theme.color }]} />

          {/* Icon Badge with Outer Ring */}
          <View style={[styles.iconOuterRing, { backgroundColor: theme.ring }]}>
            <View style={[styles.iconCircle, { backgroundColor: theme.bg }]}>
              <Ionicons name={iconName} size={30} color={theme.color} />
            </View>
          </View>

          <Text style={styles.title}>{config.title}</Text>
          {config.message ? (
            <Text style={styles.message}>{config.message}</Text>
          ) : null}

          <View
            style={[
              styles.actionsContainer,
              isTwoButtons && styles.actionsRow,
            ]}
          >
            {actions.map((act, idx) => {
              const variant =
                act.variant || (idx === actions.length - 1 ? 'primary' : 'secondary');

              const btnStyle =
                variant === 'primary'
                  ? styles.btnPrimary
                  : variant === 'danger'
                    ? styles.btnDanger
                    : variant === 'success'
                      ? styles.btnSuccess
                      : variant === 'ghost'
                        ? styles.btnGhost
                        : styles.btnSecondary;

              const textStyle =
                variant === 'primary' || variant === 'danger' || variant === 'success'
                  ? styles.btnTextInverse
                  : variant === 'ghost'
                    ? styles.btnTextMuted
                    : styles.btnTextPrimary;

              const iconColor =
                variant === 'primary' || variant === 'danger' || variant === 'success'
                  ? '#FFFFFF'
                  : variant === 'ghost'
                    ? colors.textSecondary
                    : colors.primary;

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.82}
                  style={[
                    styles.actionBtn,
                    btnStyle,
                    isTwoButtons && { flex: 1 },
                  ]}
                  onPress={async () => {
                    hide();
                    if (act.onPress) {
                      await act.onPress();
                    }
                  }}
                >
                  {act.icon ? (
                    <Ionicons name={act.icon} size={18} color={iconColor} />
                  ) : null}
                  <Text style={textStyle} numberOfLines={1}>
                    {act.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 28, 53, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadows.elevated,
  },
  topAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
  },
  iconOuterRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.section,
    fontSize: 19,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    ...type.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  actionsContainer: {
    width: '100%',
    marginTop: spacing.xl,
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionBtn: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnDanger: {
    backgroundColor: colors.expense,
  },
  btnSuccess: {
    backgroundColor: colors.income,
  },
  btnSecondary: {
    backgroundColor: colors.primarySoft,
  },
  btnGhost: {
    backgroundColor: colors.surfaceSecondary,
  },
  btnTextInverse: {
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnTextPrimary: {
    fontFamily: fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  btnTextMuted: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
