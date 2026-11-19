import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showDialog } from '../components/AppDialog';
import {
  LaundryService,
  PaymentMethod,
  PaymentStatus,
} from '../db/database';
import { formatRupiah } from '../lib/format';
import { sendOrderWhatsApp } from '../lib/receipt';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, shadows, spacing } from '../theme/tokens';

export default function AddOrderScreen() {
  const services = useAppStore((s) => s.services);
  const customers = useAppStore((s) => s.customers);
  const promos = useAppStore((s) => s.promos);
  const settings = useAppStore((s) => s.settings);
  const createLaundryOrder = useAppStore((s) => s.createLaundryOrder);

  const defaultService = useMemo<LaundryService | undefined>(() => {
    return services.find((s) => s.is_default === 1) || services[0];
  }, [services]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [qtyStr, setQtyStr] = useState('3');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('lunas');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Tunai');
  const [dpAmountStr, setDpAmountStr] = useState('');
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const activeService = useMemo(() => {
    if (selectedServiceId) {
      return services.find((s) => s.id === selectedServiceId) || defaultService;
    }
    return defaultService;
  }, [selectedServiceId, services, defaultService]);

  const parsedQty = useMemo(() => {
    const clean = qtyStr.replace(',', '.').replace(/[^0-9.]/g, '');
    const n = parseFloat(clean);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [qtyStr]);

  const unitPrice = activeService?.price || settings.defaultPricePerKg || 7000;
  const subtotal = Math.round(parsedQty * unitPrice);

  const selectedPromo = useMemo(
    () => promos.find((p) => p.id === selectedPromoId) || null,
    [promos, selectedPromoId]
  );

  const discountAmount = useMemo(() => {
    if (!selectedPromo) return 0;
    if (selectedPromo.discount_type === 'percent') {
      return Math.round((subtotal * selectedPromo.discount_value) / 100);
    }
    return Math.min(subtotal, selectedPromo.discount_value);
  }, [selectedPromo, subtotal]);

  const totalAmount = Math.max(0, subtotal - discountAmount);

  const customerSuggestions = useMemo(() => {
    const q = customerName.trim().toLowerCase();
    if (!q) return customers.slice(0, 4);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) &&
          c.name.toLowerCase() !== q
      )
      .slice(0, 4);
  }, [customers, customerName]);

  const handleCreateOrder = async () => {
    if (!customerName.trim()) {
      showDialog({
        tone: 'warning',
        title: 'Nama pelanggan kosong',
        message: 'Ketik nama pelanggan terlebih dahulu.',
      });
      return;
    }
    if (parsedQty <= 0) {
      showDialog({
        tone: 'warning',
        title: 'Berat / jumlah kosong',
        message: 'Masukkan berat (kg) atau jumlah cucian.',
      });
      return;
    }

    const dpNum = parseInt(dpAmountStr.replace(/[^\d]/g, ''), 10) || 0;

    const created = await createLaundryOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      items: [
        {
          serviceId: activeService?.id || null,
          serviceName: activeService?.name || 'Cuci Kiloan',
          unit: activeService?.unit || 'kg',
          qty: parsedQty,
          pricePerUnit: unitPrice,
        },
      ],
      discountAmount,
      paymentStatus,
      paidAmount: paymentStatus === 'dp' ? dpNum : totalAmount,
      paymentMethod,
      durationHours: activeService?.duration_hours || 48,
      notes: notes.trim(),
    });

    showDialog({
      tone: 'success',
      title: 'Cucian berhasil disimpan!',
      message: `${created.order_code} · ${created.customer_name}\nTotal Tagihan: ${formatRupiah(created.total_amount)}`,
      actions: [
        {
          label: 'Lihat & Bagikan Struk',
          variant: 'primary',
          icon: 'receipt-outline',
          onPress: () =>
            router.replace({ pathname: '/order-detail', params: { id: created.id } }),
        },
        {
          label: 'Kirim ke WhatsApp',
          variant: 'success',
          icon: 'logo-whatsapp',
          onPress: () => {
            sendOrderWhatsApp(created, settings);
            router.back();
          },
        },
        {
          label: 'Selesai',
          variant: 'ghost',
          onPress: () => router.back(),
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tambah cucian</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Total Tagihan Card */}
          <View style={styles.liveTotalBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.liveTotalLabel}>
                Total tagihan · {activeService?.name || 'Cuci Kiloan'}
              </Text>
              <Text style={styles.liveTotalValue}>{formatRupiah(totalAmount)}</Text>
            </View>
            <View style={styles.unitRatePill}>
              <Text style={styles.unitRateText}>
                {formatRupiah(unitPrice)}/{activeService?.unit || 'kg'}
              </Text>
            </View>
          </View>

          {/* 1. Nama Pelanggan */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nama pelanggan</Text>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Ketik nama pelanggan"
              placeholderTextColor={colors.textMuted}
            />

            {customerSuggestions.length > 0 && (
              <View style={styles.suggestionsRow}>
                {customerSuggestions.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.suggestionChip}
                    onPress={() => {
                      setCustomerName(c.name);
                      if (c.phone) setCustomerPhone(c.phone);
                    }}
                  >
                    <Ionicons name="person-outline" size={12} color={colors.primary} />
                    <Text style={styles.suggestionChipText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* 2. Nomor WhatsApp */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nomor WhatsApp</Text>
            <TextInput
              style={styles.input}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              keyboardType="phone-pad"
              placeholder="0812xxxx (opsional)"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* 3. Berat / Jumlah */}
          <View style={styles.fieldGroup}>
            <View style={styles.rowBetween}>
              <Text style={styles.label}>
                {activeService?.unit === 'kg' || !activeService
                  ? 'Berat (kg)'
                  : `Jumlah (${activeService.unit})`}
              </Text>
              <View style={styles.quickWeightRow}>
                {['2', '3', '5', '7'].map((w) => (
                  <TouchableOpacity
                    key={w}
                    style={[
                      styles.quickWeightBtn,
                      qtyStr === w && styles.quickWeightBtnActive,
                    ]}
                    onPress={() => setQtyStr(w)}
                  >
                    <Text
                      style={[
                        styles.quickWeightText,
                        qtyStr === w && styles.quickWeightTextActive,
                      ]}
                    >
                      {w} {activeService?.unit || 'kg'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={styles.input}
              value={qtyStr}
              onChangeText={setQtyStr}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Opsi Lainnya Toggle */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
          >
            <View style={styles.advancedToggleLeft}>
              <Ionicons
                name="options-outline"
                size={18}
                color={colors.primary}
              />
              <Text style={styles.advancedToggleText}>
                Opsi lainnya (Paket, Pembayaran, Promo, Catatan)
              </Text>
            </View>
            <Ionicons
              name={showAdvanced ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>

          {showAdvanced && (
            <View style={styles.advancedCard}>
              <Text style={styles.label}>Pilih paket layanan</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: spacing.md }}
              >
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {services.map((srv) => {
                    const selected = activeService?.id === srv.id;
                    return (
                      <TouchableOpacity
                        key={srv.id}
                        style={[
                          styles.serviceChip,
                          selected && styles.serviceChipActive,
                        ]}
                        onPress={() => setSelectedServiceId(srv.id)}
                      >
                        <Text
                          style={[
                            styles.serviceChipTitle,
                            selected && { color: '#FFFFFF' },
                          ]}
                        >
                          {srv.name}
                        </Text>
                        <Text
                          style={[
                            styles.serviceChipSub,
                            selected && { color: 'rgba(255,255,255,0.85)' },
                          ]}
                        >
                          {formatRupiah(srv.price)}/{srv.unit}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <Text style={styles.label}>Pembayaran</Text>
              <View style={styles.optionRow}>
                {(
                  [
                    { key: 'lunas', label: 'Lunas' },
                    { key: 'belum_lunas', label: 'Bayar nanti' },
                    { key: 'dp', label: 'DP' },
                  ] as const
                ).map((st) => {
                  const active = paymentStatus === st.key;
                  return (
                    <TouchableOpacity
                      key={st.key}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                      onPress={() => setPaymentStatus(st.key)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          active && styles.optionChipTextActive,
                        ]}
                      >
                        {st.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {paymentStatus === 'dp' && (
                <View style={{ marginTop: spacing.md }}>
                  <Text style={styles.label}>Nominal DP (Rp)</Text>
                  <TextInput
                    style={styles.input}
                    value={dpAmountStr}
                    onChangeText={setDpAmountStr}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}

              <Text style={[styles.label, { marginTop: spacing.md }]}>
                Metode pembayaran
              </Text>
              <View style={styles.optionRow}>
                {(['Tunai', 'Transfer bank', 'QRIS'] as const).map((m) => {
                  const active = paymentMethod === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.optionChip, active && styles.optionChipActive]}
                      onPress={() => setPaymentMethod(m)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          active && styles.optionChipTextActive,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {promos.length > 0 && (
                <>
                  <Text style={[styles.label, { marginTop: spacing.md }]}>
                    Promo
                  </Text>
                  <View style={styles.optionRow}>
                    <TouchableOpacity
                      style={[
                        styles.optionChip,
                        selectedPromoId === null && styles.optionChipActive,
                      ]}
                      onPress={() => setSelectedPromoId(null)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          selectedPromoId === null && styles.optionChipTextActive,
                        ]}
                      >
                        Tanpa promo
                      </Text>
                    </TouchableOpacity>
                    {promos.map((p) => {
                      const active = selectedPromoId === p.id;
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.optionChip, active && styles.optionChipActive]}
                          onPress={() => setSelectedPromoId(p.id)}
                        >
                          <Text
                            style={[
                              styles.optionChipText,
                              active && styles.optionChipTextActive,
                            ]}
                          >
                            {p.code}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              <Text style={[styles.label, { marginTop: spacing.md }]}>
                Catatan
              </Text>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Opsional"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.saveButton}
            onPress={handleCreateOrder}
          >
            <Text style={styles.saveButtonText}>
              Simpan cucian · {formatRupiah(totalAmount)}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 36,
  },
  liveTotalBanner: {
    backgroundColor: colors.incomeBg,
    borderRadius: radius.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  liveTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.income,
  },
  liveTotalValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.income,
    marginTop: 4,
  },
  unitRatePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  unitRateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.income,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.textPrimary,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quickWeightRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickWeightBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
  },
  quickWeightBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickWeightText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  quickWeightTextActive: {
    color: '#FFFFFF',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  advancedToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  advancedToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    flex: 1,
  },
  advancedCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  serviceChip: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  serviceChipActive: {
    backgroundColor: colors.primary,
  },
  serviceChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  serviceChipSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    ...shadows.elevated,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
