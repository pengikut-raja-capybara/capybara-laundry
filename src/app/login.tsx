import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showDialog } from '../components/AppDialog';
import { BrandWordmark } from '../components/BrandWordmark';
import { Button, Field } from '../components/ui';
import { formatDigitsWithDots, parseRupiahInput } from '../lib/format';
import {
  authenticateWithBiometrics,
  getLockoutStatus,
  isBiometricEnabled,
  isMasterCodeConfigured,
  resetPasswordWithMasterCode,
  setupAppPassword,
  verifyAppPassword,
} from '../lib/security';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, shadows, spacing, type } from '../theme/tokens';

const MIN_PASSWORD = 4;

export default function LoginScreen() {
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const settings = useAppStore((s) => s.settings);
  const setAuthenticated = useAppStore((s) => s.setAuthenticated);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const updateBusinessSettings = useAppStore((s) => s.updateBusinessSettings);

  const [shopName, setShopName] = useState('');
  const [pricePerKg, setPricePerKg] = useState(String(settings.defaultPricePerKg || 7000));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const [resetOpen, setResetOpen] = useState(false);
  const [masterCode, setMasterCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [status, bio] = await Promise.all([getLockoutStatus(), isBiometricEnabled()]);
      if (!active) return;
      if (status.isLocked) setLockoutSeconds(Math.ceil(status.remainingMs / 1000));
      setBiometricAvailable(bio);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => setLockoutSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const isLockedOut = lockoutSeconds > 0;

  const handleLockout = (remainingMs: number) => {
    const secs = Math.ceil(remainingMs / 1000);
    setLockoutSeconds(secs);
  };

  const handleSubmit = async () => {
    if (isLockedOut || isSubmitting) return;
    const pass = password.trim();
    if (pass.length < MIN_PASSWORD) {
      showDialog({
        tone: 'warning',
        title: 'Kata sandi terlalu pendek',
        message: `Masukkan minimal ${MIN_PASSWORD} karakter.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (!isOnboarded) {
        if (pass !== confirmPassword.trim()) {
          showDialog({
            tone: 'warning',
            title: 'Kata sandi tidak cocok',
            message: 'Ketik ulang kata sandi yang sama.',
          });
          return;
        }
        await setupAppPassword(pass);
        await updateBusinessSettings({
          shopName: shopName.trim() || 'CaNdry Laundry',
          defaultPricePerKg: parseRupiahInput(pricePerKg) || 7000,
        });
        setOnboarded(true);
        setAuthenticated(true);
        return;
      }

      const result = await verifyAppPassword(pass);
      if (!result.ok) {
        if (result.lockout.isLocked) {
          handleLockout(result.lockout.remainingMs);
        } else {
          const left = Math.max(0, 5 - result.lockout.failedAttempts);
          showDialog({
            tone: 'danger',
            icon: 'lock-closed-outline',
            title: 'Kata sandi salah',
            message: left > 0 ? `Kata sandi tidak sesuai. Sisa ${left} percobaan.` : 'Kata sandi tidak sesuai.',
          });
        }
        return;
      }
      setPassword('');
      setAuthenticated(true);
    } catch (err: any) {
      showDialog({
        tone: 'danger',
        title: 'Terjadi kesalahan',
        message: err?.message || 'Coba lagi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBiometric = async () => {
    if (isLockedOut) return;
    if (await authenticateWithBiometrics()) setAuthenticated(true);
  };

  const handleReset = async () => {
    if (isLockedOut || isSubmitting) return;
    if (!isMasterCodeConfigured()) {
      showDialog({
        tone: 'warning',
        title: 'Kode master belum diatur',
        message: 'Jalankan `npm run set-master-code` lalu muat ulang aplikasi.',
      });
      return;
    }
    if (!masterCode.trim() || newPassword.trim().length < MIN_PASSWORD) {
      showDialog({
        tone: 'warning',
        title: 'Belum lengkap',
        message: `Isi kode master dan kata sandi baru (minimal ${MIN_PASSWORD} karakter).`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPasswordWithMasterCode(masterCode, newPassword);
      if (!result.ok) {
        if (result.lockout.isLocked) handleLockout(result.lockout.remainingMs);
        else {
          showDialog({
            tone: 'danger',
            title: 'Kode master salah',
            message: 'Kode master yang Anda masukkan tidak cocok.',
          });
        }
        return;
      }
      setResetOpen(false);
      setMasterCode('');
      setNewPassword('');
      setPassword('');
      showDialog({
        tone: 'success',
        title: 'Kata sandi diperbarui',
        message: 'Silakan masuk menggunakan kata sandi baru Anda.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const eyeToggle = (
    <TouchableOpacity
      style={styles.eye}
      onPress={() => setShowPassword((v) => !v)}
      accessibilityLabel={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
    >
      <Ionicons
        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
        size={20}
        color={colors.textSecondary}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Soft decorative backdrop shapes so the screen feels warm and anchored */}
      <View style={styles.topBackdrop} />
      <View style={styles.decorBubbleLeft} />
      <View style={styles.decorBubbleRight} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Mascot Avatar + Stylized CaNdry Wordmark */}
          <View style={styles.heroSection}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarWrap}>
                <Image
                  source={require('../../assets/images/capybara-hero.jpg')}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.avatarBadge}>
                <Ionicons
                  name={isOnboarded ? 'lock-closed' : 'sparkles'}
                  size={14}
                  color="#FFFFFF"
                />
              </View>
            </View>

            <BrandWordmark size="lg" />

            {isOnboarded && (
              <View style={styles.shopPill}>
                <Ionicons name="storefront-outline" size={14} color={colors.primary} />
                <Text style={styles.shopPillText}>{settings.shopName}</Text>
              </View>
            )}
          </View>

          {/* Elevated Form Card */}
          <View style={styles.formCard}>
            {isLockedOut && (
              <View style={styles.lockout}>
                <Ionicons name="time-outline" size={18} color={colors.expense} />
                <Text style={styles.lockoutText}>
                  Coba lagi dalam {lockoutSeconds} detik
                </Text>
              </View>
            )}

            {!isOnboarded && (
              <>
                <Field
                  label="Nama laundry"
                  value={shopName}
                  onChangeText={setShopName}
                  placeholder="CaNdry Laundry"
                />
                <Field
                  label="Harga per kg (Rp)"
                  value={formatDigitsWithDots(pricePerKg)}
                  onChangeText={(t) => setPricePerKg(String(parseRupiahInput(t)))}
                  keyboardType="numeric"
                  placeholder="7.000"
                />
              </>
            )}

            <Field
              label="Kata sandi"
              accessory={
                isOnboarded ? (
                  <TouchableOpacity onPress={() => setResetOpen(true)} hitSlop={8}>
                    <Text style={styles.link}>Lupa kata sandi?</Text>
                  </TouchableOpacity>
                ) : undefined
              }
              trailing={eyeToggle}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!isLockedOut}
              autoCapitalize="none"
              placeholder="••••••"
              onSubmitEditing={isOnboarded ? handleSubmit : undefined}
            />

            {!isOnboarded && (
              <Field
                label="Ulangi kata sandi"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholder="••••••"
              />
            )}

            <Button
              label={isOnboarded ? 'Masuk' : 'Simpan & Mulai'}
              icon={isOnboarded ? 'log-in-outline' : 'checkmark-circle-outline'}
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isLockedOut}
              style={{ marginTop: spacing.xs }}
            />

            {isOnboarded && biometricAvailable && Platform.OS !== 'web' && (
              <Button
                label="Gunakan biometrik"
                icon="finger-print-outline"
                variant="ghost"
                onPress={handleBiometric}
                disabled={isLockedOut}
                style={{ marginTop: spacing.xs }}
              />
            )}
          </View>

          {/* Shortcut to Credits / About CaNdry at the bottom of Login */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.creditsBadge}
            onPress={() => router.push('/credits')}
          >
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={colors.textSecondary}
            />
            <Text style={styles.creditsBadgeText}>
              CaNdry v1.0.0 • Tentang Aplikasi
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={resetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setResetOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setResetOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Reset kata sandi</Text>
              <TouchableOpacity onPress={() => setResetOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Field
              label="Kode master"
              value={masterCode}
              onChangeText={setMasterCode}
              secureTextEntry
              autoCapitalize="none"
            />
            <Field
              label="Kata sandi baru"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />
            <Button
              label="Reset"
              onPress={handleReset}
              loading={isSubmitting}
              disabled={isLockedOut}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  topBackdrop: {
    position: 'absolute',
    top: -120,
    left: -40,
    right: -40,
    height: 310,
    backgroundColor: '#E4EEFF',
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 180,
  },
  decorBubbleLeft: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(35, 88, 208, 0.14)',
  },
  decorBubbleRight: {
    position: 'absolute',
    top: 90,
    right: 32,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(35, 88, 208, 0.12)',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarRing: {
    padding: 5,
    borderRadius: 64,
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.md,
    ...shadows.elevated,
  },
  avatarWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 112,
    height: 112,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  shopPillText: {
    ...type.label,
    color: colors.textSecondary,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#E8EEF7',
    ...shadows.card,
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 6,
    marginTop: spacing.xl,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  creditsBadgeText: {
    ...type.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  lockout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.expenseBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  lockoutText: {
    ...type.label,
    color: colors.expense,
  },
  link: {
    ...type.label,
    color: colors.primary,
  },
  eye: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
    padding: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    ...type.section,
    color: colors.textPrimary,
  },
});
