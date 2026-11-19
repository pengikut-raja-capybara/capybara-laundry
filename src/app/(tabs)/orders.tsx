import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MonthPickerTrigger } from "../../components/MonthPickerModal";
import { ScreenHeader } from "../../components/ui";
import { OrderStatus } from "../../db/database";
import { formatDateShortWithTime, formatRupiah, localYearMonthOf } from "../../lib/format";
import { sendOrderWhatsApp } from "../../lib/receipt";
import { useAppStore } from "../../store/useAppStore";
import { colors, radius, shadows, spacing, type } from "../../theme/tokens";

const STATUS_STEPS: { key: OrderStatus; label: string; color: string; bg: string }[] = [
  { key: "diterima", label: "Diterima", color: "#1D4ED8", bg: "#DBEAFE" },
  { key: "diproses", label: "Diproses", color: "#B45309", bg: "#FEF3C7" },
  { key: "selesai", label: "Selesai", color: "#0D8A52", bg: "#E6F5EE" },
  { key: "diambil", label: "Diambil", color: "#475569", bg: "#F1F5F9" },
];

type QuickFilter = "semua" | OrderStatus | "belum_lunas";

const FILTER_TABS: { key: QuickFilter; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "diterima", label: "Diterima" },
  { key: "diproses", label: "Diproses" },
  { key: "selesai", label: "Selesai" },
  { key: "diambil", label: "Diambil" },
];

export default function OrdersScreen() {
  const orders = useAppStore((s) => s.orders);
  const settings = useAppStore((s) => s.settings);
  const selectedYearMonth = useAppStore((s) => s.selectedYearMonth);
  const setSelectedYearMonth = useAppStore((s) => s.setSelectedYearMonth);
  const updateOrderStatus = useAppStore((s) => s.updateOrderStatus);
  const settleOrderPayment = useAppStore((s) => s.settleOrderPayment);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuickFilter>("semua");

  const monthOrders = useMemo(() => orders.filter((o) => localYearMonthOf(o.created_at) === selectedYearMonth), [orders, selectedYearMonth]);

  const stats = useMemo(() => {
    const inProgress = monthOrders.filter((o) => o.status === "diterima" || o.status === "diproses").length;
    const ready = monthOrders.filter((o) => o.status === "selesai").length;
    const unpaid = monthOrders.filter((o) => o.payment_status !== "lunas").length;
    return { inProgress, ready, unpaid };
  }, [monthOrders]);

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return monthOrders.filter((o) => {
      if (statusFilter === "belum_lunas") {
        if (o.payment_status === "lunas") return false;
      } else if (statusFilter !== "semua" && o.status !== statusFilter) {
        return false;
      }
      if (q) {
        const hay = `${o.customer_name} ${o.order_code} ${o.notes}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [monthOrders, statusFilter, searchQuery]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        title="Cucian"
        subtitle={`${monthOrders.length} nota`}
        icon="shirt-outline"
        right={<MonthPickerTrigger value={selectedYearMonth} onChange={setSelectedYearMonth} variant="header" />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Status Cucian Card (Colored 3-box version from Beranda, interactive filter) */}
        <View style={styles.laundryStatusCard}>
          <View style={styles.statusGrid}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.statusCell, { backgroundColor: colors.primarySoft }, statusFilter === "diproses" && styles.statusCellSelectedPrimary]}
              onPress={() => setStatusFilter((prev) => (prev === "diproses" ? "semua" : "diproses"))}
            >
              <Text style={[styles.statusCount, { color: colors.primary }]}>{stats.inProgress}</Text>
              <Text style={styles.statusCellLabel}>Diproses</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.statusCell, { backgroundColor: colors.incomeBg }, statusFilter === "selesai" && styles.statusCellSelectedIncome]}
              onPress={() => setStatusFilter((prev) => (prev === "selesai" ? "semua" : "selesai"))}
            >
              <Text style={[styles.statusCount, { color: colors.income }]}>{stats.ready}</Text>
              <Text style={styles.statusCellLabel}>Siap Ambil</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.statusCell, { backgroundColor: colors.warningBg }, statusFilter === "belum_lunas" && styles.statusCellSelectedWarning]}
              onPress={() => setStatusFilter((prev) => (prev === "belum_lunas" ? "semua" : "belum_lunas"))}
            >
              <Text style={[styles.statusCount, { color: colors.warning }]}>{stats.unpaid}</Text>
              <Text style={styles.statusCellLabel}>Belum Lunas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Cari pelanggan atau no. nota" placeholderTextColor={colors.textMuted} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Single Clean Row of Status Filter Pills */}
        <View style={styles.filterPillsRow}>
          {FILTER_TABS.map((f) => {
            const active = statusFilter === f.key;
            return (
              <TouchableOpacity key={f.key} activeOpacity={0.8} style={[styles.filterPill, active && styles.filterPillActive]} onPress={() => setStatusFilter(f.key)}>
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]} numberOfLines={1}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Order Cards List */}
        {filteredOrders.map((order) => {
          const stMeta = STATUS_STEPS.find((s) => s.key === order.status) || STATUS_STEPS[0];
          const isUnpaid = order.payment_status !== "lunas";

          return (
            <View key={order.id} style={styles.orderCard}>
              <TouchableOpacity activeOpacity={0.8} onPress={() => router.push({ pathname: "/order-detail", params: { id: order.id } })}>
                <View style={styles.orderTopRow}>
                  <View style={styles.customerAvatar}>
                    <Ionicons name="person-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.orderCustomer} numberOfLines={1}>
                      {order.customer_name}
                    </Text>
                    <Text style={styles.orderCode} numberOfLines={1}>
                      {order.order_code} • {formatDateShortWithTime(order.created_at)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: stMeta.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: stMeta.color }]}>{stMeta.label}</Text>
                  </View>
                </View>

                <View style={styles.orderMidRow}>
                  <Text style={styles.orderItemsText} numberOfLines={1}>
                    {(order.items || []).map((i) => `${i.service_name} (${i.qty} ${i.unit})`).join(", ")}
                  </Text>
                  <Text style={styles.orderTotal}>{formatRupiah(order.total_amount)}</Text>
                </View>
              </TouchableOpacity>

              {/* Direct 4-Step Status Selector */}
              <View style={styles.statusStepperRow}>
                {STATUS_STEPS.map((st) => {
                  const active = order.status === st.key;
                  return (
                    <TouchableOpacity key={st.key} style={[styles.statusStepBtn, active && { backgroundColor: st.bg, borderColor: st.color }]} onPress={() => updateOrderStatus(order.id, st.key)}>
                      <Text style={[styles.statusStepText, active && { color: st.color, fontWeight: "700" }]}>{st.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.orderActionsRow}>
                <View
                  style={[
                    styles.payPill,
                    {
                      backgroundColor: isUnpaid ? colors.warningBg : colors.incomeBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.payPillText,
                      { color: isUnpaid ? colors.warning : colors.income },
                    ]}
                    numberOfLines={1}
                  >
                    {order.payment_status === "dp"
                      ? `DP • Sisa ${formatRupiah(order.total_amount - order.paid_amount)}`
                      : isUnpaid
                        ? "Belum Lunas"
                        : `Lunas • ${order.payment_method}`}
                  </Text>
                </View>

                <View style={styles.actionButtonsGroup}>
                  {isUnpaid && (
                    <TouchableOpacity style={styles.actionBtnSettle} onPress={() => settleOrderPayment(order.id, "Tunai")}>
                      <Text style={styles.actionBtnSettleText}>Lunasi</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.iconActionBtn} onPress={() => router.push({ pathname: "/order-detail", params: { id: order.id } })} accessibilityLabel="Lihat & bagikan foto struk">
                    <Ionicons name="share-social-outline" size={17} color={colors.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.iconActionBtn} onPress={() => sendOrderWhatsApp(order, settings)} accessibilityLabel="Kirim ke WhatsApp">
                    <Ionicons name="logo-whatsapp" size={17} color={colors.income} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {filteredOrders.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="shirt-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada cucian</Text>
            <Text style={styles.emptyText}>Tekan tombol Tambah cucian di bawah untuk mencatat nota baru.</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity activeOpacity={0.85} style={styles.addBtn} onPress={() => router.push("/add-order")}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Tambah cucian</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 100,
  },
  laundryStatusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#EBF0F7",
    ...shadows.card,
  },
  statusGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statusCell: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  statusCellSelectedPrimary: {
    borderColor: colors.primary,
  },
  statusCellSelectedIncome: {
    borderColor: colors.income,
  },
  statusCellSelectedWarning: {
    borderColor: colors.warning,
  },
  statusCount: {
    ...type.title,
    fontSize: 20,
  },
  statusCellLabel: {
    ...type.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#EBF0F7",
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: spacing.lg,
  },
  filterPill: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#EBF0F7",
    ...shadows.card,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#EBF0F7",
    ...shadows.card,
  },
  orderTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  orderCustomer: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  orderCode: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    minWidth: 74,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  orderMidRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  orderItemsText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
  },
  statusStepperRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  statusStepBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
  },
  statusStepText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  orderActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  payPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    flexShrink: 1,
    marginRight: 8,
  },
  payPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionButtonsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtnSettle: {
    backgroundColor: colors.income,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  actionBtnSettleText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EBF0F7",
    ...shadows.card,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...type.bodyStrong,
    color: colors.textPrimary,
  },
  emptyText: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    backgroundColor: "rgba(246, 248, 251, 0.94)",
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...shadows.elevated,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
