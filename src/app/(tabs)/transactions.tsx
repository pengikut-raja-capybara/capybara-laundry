import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { showDialog } from "../../components/AppDialog";
import { MonthPickerTrigger } from "../../components/MonthPickerModal";
import { ScreenHeader } from "../../components/ui";
import { CashTransaction } from "../../db/database";
import { formatDateLong, formatMonthYear, formatRupiah, localYearMonthOf, toLocalDateKey } from "../../lib/format";
import { useAppStore } from "../../store/useAppStore";
import { colors, radius, shadows, spacing, type } from "../../theme/tokens";

type FilterTab = "all" | "income" | "expense";

export default function TransactionsScreen() {
  const transactions = useAppStore((s) => s.transactions);
  const selectedYearMonth = useAppStore((s) => s.selectedYearMonth);
  const setSelectedYearMonth = useAppStore((s) => s.setSelectedYearMonth);
  const deleteCashTransaction = useAppStore((s) => s.deleteCashTransaction);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  const monthTransactions = useMemo(() => transactions.filter((tx) => localYearMonthOf(tx.transaction_date) === selectedYearMonth), [transactions, selectedYearMonth]);

  const { monthIncome, monthExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const tx of monthTransactions) {
      if (tx.type === "income") inc += tx.amount;
      else exp += tx.amount;
    }
    return { monthIncome: inc, monthExpense: exp };
  }, [monthTransactions]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return monthTransactions.filter((tx) => {
      if (filterTab === "income" && tx.type !== "income") return false;
      if (filterTab === "expense" && tx.type !== "expense") return false;
      if (q) {
        const hay = `${tx.title} ${tx.category} ${tx.notes} ${tx.payment_method}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [monthTransactions, filterTab, searchQuery]);

  const groupedByDate = useMemo(() => {
    const groups: { dateKey: string; label: string; items: CashTransaction[] }[] = [];
    const map = new Map<string, CashTransaction[]>();

    for (const tx of filteredTransactions) {
      const key = toLocalDateKey(tx.transaction_date);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(tx);
    }

    for (const [dateKey, items] of map.entries()) {
      groups.push({
        dateKey,
        label: formatDateLong(items[0].transaction_date),
        items,
      });
    }

    return groups;
  }, [filteredTransactions]);

  const handleLongPressDelete = (tx: CashTransaction) => {
    showDialog({
      tone: "danger",
      title: "Hapus transaksi?",
      message: `Catatan "${tx.title}" sebesar ${formatRupiah(tx.amount)} akan dihapus.`,
      actions: [
        { label: "Batal", variant: "ghost" },
        {
          label: "Hapus",
          variant: "danger",
          icon: "trash-outline",
          onPress: () => deleteCashTransaction(tx.id),
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        title="Transaksi"
        subtitle={`${filteredTransactions.length} catatan`}
        icon="swap-horizontal-outline"
        right={<MonthPickerTrigger value={selectedYearMonth} onChange={setSelectedYearMonth} variant="header" />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Monthly Summary Banner */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: colors.incomeBg }]}>
            <View style={styles.summaryTop}>
              <Ionicons name="arrow-down-circle" size={16} color={colors.income} />
              <Text style={[styles.summaryLabel, { color: colors.income }]}>Pemasukan</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: colors.income }]}>{formatRupiah(monthIncome)}</Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: colors.expenseBg }]}>
            <View style={styles.summaryTop}>
              <Ionicons name="arrow-up-circle" size={16} color={colors.expense} />
              <Text style={[styles.summaryLabel, { color: colors.expense }]}>Pengeluaran</Text>
            </View>
            <Text style={[styles.summaryAmount, { color: colors.expense }]}>{formatRupiah(monthExpense)}</Text>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput style={styles.searchInput} value={searchQuery} onChangeText={setSearchQuery} placeholder="Cari nama atau kategori transaksi" placeholderTextColor={colors.textMuted} />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips: Semua / Pemasukan / Pengeluaran */}
        <View style={styles.filterPillsRow}>
          {(
            [
              { key: "all", label: "Semua" },
              { key: "income", label: "Pemasukan" },
              { key: "expense", label: "Pengeluaran" },
            ] as const
          ).map((tab) => {
            const active = filterTab === tab.key;
            return (
              <TouchableOpacity key={tab.key} activeOpacity={0.8} style={[styles.filterPill, active && styles.filterPillActive]} onPress={() => setFilterTab(tab.key)}>
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Grouped Transaction Cards by Date */}
        {groupedByDate.map((group) => (
          <View key={group.dateKey} style={styles.dateGroup}>
            <Text style={styles.dateGroupTitle}>{group.label}</Text>
            <View style={styles.groupCard}>
              {group.items.map((tx, idx) => {
                const isIncome = tx.type === "income";
                const isLast = idx === group.items.length - 1;
                return (
                  <TouchableOpacity
                    key={tx.id}
                    activeOpacity={0.75}
                    onLongPress={() => handleLongPressDelete(tx)}
                    onPress={() => {
                      if (tx.order_id) {
                        router.push({
                          pathname: "/order-detail",
                          params: { id: tx.order_id },
                        });
                      }
                    }}
                    style={[styles.txRow, !isLast && styles.txRowDivider]}
                  >
                    <View
                      style={[
                        styles.txIconBox,
                        {
                          backgroundColor: isIncome ? colors.incomeBg : colors.expenseBg,
                        },
                      ]}
                    >
                      <Ionicons name={isIncome ? "arrow-down" : "arrow-up"} size={18} color={isIncome ? colors.income : colors.expense} />
                    </View>

                    <View style={styles.txInfo}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <Text style={styles.txSub} numberOfLines={1}>
                        {tx.category} • {tx.payment_method}
                        {tx.notes ? ` • ${tx.notes}` : ""}
                      </Text>
                    </View>

                    <Text style={[styles.txAmount, { color: isIncome ? colors.income : colors.expense }]}>{isIncome ? formatRupiah(tx.amount, { showPlus: true }) : formatRupiah(-tx.amount)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {groupedByDate.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
            <Text style={styles.emptySub}>Tidak ada catatan pada bulan {formatMonthYear(selectedYearMonth)}.</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity activeOpacity={0.85} style={styles.addBtn} onPress={() => router.push("/add-transaction")}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Tambah transaksi</Text>
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
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryBox: {
    flex: 1,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  summaryLabel: {
    ...type.caption,
    fontWeight: "700",
  },
  summaryAmount: {
    ...type.section,
    fontSize: 16,
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
    gap: 10,
    marginBottom: spacing.lg,
  },
  filterPill: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 10,
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
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateGroupTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: 8,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: "#EBF0F7",
    ...shadows.card,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  txRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  txInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  txTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  txSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: "800",
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
  emptySub: {
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
