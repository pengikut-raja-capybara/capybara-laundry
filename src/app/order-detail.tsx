import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { useMemo, useRef } from "react";
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ViewShot from "react-native-view-shot";
import { showDialog } from "../components/AppDialog";
import { OrderStatus } from "../db/database";
import { formatDateShortWithTime, formatRupiah } from "../lib/format";
import { sendOrderWhatsApp } from "../lib/receipt";
import { withAutoLockSuppressed } from "../lib/security";
import { useAppStore } from "../store/useAppStore";
import { colors, radius, shadows, spacing } from "../theme/tokens";

const STATUS_OPTIONS: { key: OrderStatus; label: string }[] = [
  { key: "diterima", label: "Diterima" },
  { key: "diproses", label: "Diproses" },
  { key: "selesai", label: "Selesai" },
  { key: "diambil", label: "Diambil" },
];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orders = useAppStore((s) => s.orders);
  const settings = useAppStore((s) => s.settings);
  const updateOrderStatus = useAppStore((s) => s.updateOrderStatus);
  const settleOrderPayment = useAppStore((s) => s.settleOrderPayment);
  const deleteOrder = useAppStore((s) => s.deleteOrder);

  const receiptRef = useRef<any>(null);

  const order = useMemo(() => orders.find((o) => o.id === id), [orders, id]);

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail Nota</Text>
        </View>
        <View style={{ padding: spacing.xl }}>
          <Text>Nota tidak ditemukan.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const remaining = Math.max(0, order.total_amount - order.paid_amount);

  const handleConfirmDeleteOrder = () => {
    showDialog({
      tone: "danger",
      title: "Hapus nota cucian?",
      message: `Nota ${order.order_code} (${order.customer_name}) beserta catatan transaksi kas terkait akan dihapus.`,
      actions: [
        { label: "Batal", variant: "ghost" },
        {
          label: "Hapus Nota",
          variant: "danger",
          icon: "trash-outline",
          onPress: async () => {
            await deleteOrder(order.id);
            router.back();
          },
        },
      ],
    });
  };

  const handleShareReceiptImage = async () => {
    if (Platform.OS === "web") {
      showDialog({
        tone: "info",
        title: "Bagikan Foto Struk",
        message: "Fitur bagikan gambar struk tersedia di aplikasi Android & iOS.",
      });
      return;
    }
    await withAutoLockSuppressed(async () => {
      try {
        const uri = await receiptRef.current?.capture?.();
        if (!uri) {
          showDialog({
            tone: "warning",
            title: "Gagal menangkap gambar",
            message: "Tidak dapat mengambil gambar struk.",
          });
          return;
        }
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: `Struk ${order.order_code}`,
          });
        } else {
          showDialog({
            tone: "success",
            title: "Struk tersimpan",
            message: `Gambar struk disimpan di: ${uri}`,
          });
        }
      } catch {
        showDialog({
          tone: "danger",
          title: "Gagal membagikan struk",
          message: "Terjadi kesalahan saat membagikan gambar struk.",
        });
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header with Icon-Only Share Actions (Photo & WhatsApp only) */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Detail Nota</Text>
          <Text style={styles.headerSub}>{order.order_code}</Text>
        </View>
        <View style={styles.headerIconActions}>
          <TouchableOpacity style={[styles.iconCircleBtn, { backgroundColor: colors.primarySoft }]} onPress={handleShareReceiptImage} accessibilityLabel="Bagikan foto struk">
            <Ionicons name="share-social-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.iconCircleBtn, { backgroundColor: colors.incomeBg }]} onPress={() => sendOrderWhatsApp(order, settings)} accessibilityLabel="Kirim ke WhatsApp">
            <Ionicons name="logo-whatsapp" size={20} color={colors.income} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.iconCircleBtn, { backgroundColor: colors.expenseBg }]} onPress={handleConfirmDeleteOrder} accessibilityLabel="Hapus nota cucian">
            <Ionicons name="trash-outline" size={20} color={colors.expense} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Visual Receipt Card wrapped in ViewShot for PNG export */}
        <ViewShot ref={receiptRef} options={{ format: "png", quality: 0.95 }}>
          <View style={styles.receiptPaper}>
            <View style={styles.receiptHeader}>
              <Text style={styles.shopBrand}>{settings.shopName}</Text>
              {settings.tagline ? <Text style={styles.shopTagline}>{settings.tagline}</Text> : null}
              {settings.address || settings.phone ? (
                <Text style={styles.shopAddress}>
                  {[settings.address, settings.phone]
                    .map((s) => (s || "").trim())
                    .filter(Boolean)
                    .join(" • ")}
                </Text>
              ) : null}
            </View>

            <View style={styles.dashedDivider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>No. Nota</Text>
              <Text style={styles.metaValueBold}>{order.order_code}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Pelanggan</Text>
              <Text style={styles.metaValueBold}>{order.customer_name}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Masuk</Text>
              <Text style={styles.metaValue}>{formatDateShortWithTime(order.created_at)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Estimasi Selesai</Text>
              <Text style={styles.metaValue}>{formatDateShortWithTime(order.estimated_done_at)}</Text>
            </View>

            <View style={styles.dashedDivider} />

            {/* Order Items */}
            {(order.items || []).map((it) => (
              <View key={it.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{it.service_name}</Text>
                  <Text style={styles.itemSub}>
                    {it.qty} {it.unit} × {formatRupiah(it.price_per_unit)}
                  </Text>
                </View>
                <Text style={styles.itemSubtotal}>{formatRupiah(it.subtotal)}</Text>
              </View>
            ))}

            <View style={styles.dashedDivider} />

            {order.discount_amount > 0 && (
              <>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Subtotal</Text>
                  <Text style={styles.metaValue}>{formatRupiah(order.subtotal)}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={[styles.metaLabel, { color: colors.income }]}>Diskon</Text>
                  <Text style={[styles.metaValueBold, { color: colors.income }]}>−{formatRupiah(order.discount_amount)}</Text>
                </View>
              </>
            )}

            <View style={[styles.metaRow, { marginTop: 4 }]}>
              <Text style={styles.totalLabel}>Total Tagihan</Text>
              <Text style={styles.totalValue}>{formatRupiah(order.total_amount)}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status Bayar</Text>
              <Text
                style={[
                  styles.metaValueBold,
                  {
                    color: order.payment_status === "lunas" ? colors.income : colors.warning,
                  },
                ]}
              >
                {order.payment_status === "lunas"
                  ? `LUNAS (${order.payment_method})`
                  : order.payment_status === "dp"
                    ? `DP (${formatRupiah(order.paid_amount)})`
                    : "BELUM LUNAS"}
              </Text>
            </View>

            {remaining > 0 && (
              <View style={styles.metaRow}>
                <Text style={[styles.metaLabel, { color: colors.expense, fontWeight: "700" }]}>
                  Sisa Tagihan
                </Text>
                <Text style={[styles.metaValueBold, { color: colors.expense }]}>
                  {formatRupiah(remaining)}
                </Text>
              </View>
            )}

            {order.notes ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteText}>Catatan: {order.notes}</Text>
              </View>
            ) : null}

            {settings.receiptFooter ? <Text style={styles.receiptFooter}>{settings.receiptFooter}</Text> : null}

            <View style={styles.appCreditWrap}>
              <Text style={styles.appCreditText}>
                Dicetak dengan <Text style={styles.appCreditBrand}>CaNdry</Text>
              </Text>
            </View>
          </View>
        </ViewShot>

        {/* Update Status Cucian */}
        <View style={styles.controlCard}>
          <Text style={styles.controlTitle}>Status Pengerjaan Cucian</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((st) => {
              const active = order.status === st.key;
              return (
                <TouchableOpacity key={st.key} style={[styles.statusChip, active && styles.statusChipActive]} onPress={() => updateOrderStatus(order.id, st.key)}>
                  <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>{st.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {order.payment_status !== "lunas" && (
            <TouchableOpacity style={styles.settleButton} onPress={() => settleOrderPayment(order.id, "Tunai")}>
              <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
              <Text style={styles.settleButtonText}>Tandai Lunas ({formatRupiah(remaining)})</Text>
            </TouchableOpacity>
          )}
        </View>
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
    paddingTop: spacing.xs,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  headerIconActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shareIconRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: spacing.xl,
  },
  shareIconLarge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  receiptPaper: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.card,
  },
  receiptHeader: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  shopBrand: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
  shopTagline: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  shopAddress: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderBottomColor: colors.border,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metaValue: {
    fontSize: 13,
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: "right",
  },
  metaValueBold: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: "right",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  itemSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemSubtotal: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.primary,
  },
  noteBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.sm,
  },
  noteText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  receiptFooter: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 12,
    color: colors.textSecondary,
  },
  appCreditWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderTopColor: colors.borderLight,
    alignItems: "center",
  },
  appCreditText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  appCreditBrand: {
    fontWeight: "700",
    color: colors.primary,
  },
  controlCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.card,
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 10,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusChip: {
    flex: 1,
    minWidth: 72,
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: 9,
    borderRadius: radius.md,
    alignItems: "center",
  },
  statusChipActive: {
    backgroundColor: colors.primary,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  statusChipTextActive: {
    color: "#FFFFFF",
  },
  settleButton: {
    marginTop: spacing.md,
    backgroundColor: colors.income,
    borderRadius: radius.md,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  settleButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  exportGroup: {
    marginTop: spacing.lg,
    gap: 10,
  },
  exportBtnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadows.elevated,
  },
  exportBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  exportBtnSecondary: {
    backgroundColor: "#E8EFFC",
    borderRadius: radius.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  exportBtnSecondaryText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  exportBtnWa: {
    backgroundColor: colors.income,
    borderRadius: radius.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
