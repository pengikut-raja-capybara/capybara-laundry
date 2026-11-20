import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { showDialog } from "../components/AppDialog";
import { PaymentMethod, TransactionType } from "../db/database";
import { formatDateMedium, formatDigitsWithDots, parseRupiahInput, toLocalDateKey } from "../lib/format";
import { withAutoLockSuppressed } from "../lib/security";
import { useAppStore } from "../store/useAppStore";
import { colors, radius, shadows, spacing } from "../theme/tokens";

const INCOME_CATEGORIES = [
  "Pendapatan Jasa Laundry",
  "Pelunasan Piutang",
  "Penjualan Produk / Deterjen",
  "Setoran Modal",
  "Pendapatan Lain-lain",
];

const EXPENSE_CATEGORIES = [
  "Beban Bahan Baku & Mencuci",
  "Beban Utilitas (Listrik, Air, Gas)",
  "Beban Gaji & Upah",
  "Beban Sewa & Tempat",
  "Beban Perawatan & Peralatan",
  "Beban Operasional Lainnya",
];

const PAYMENT_METHODS: PaymentMethod[] = ["Tunai", "Transfer bank", "QRIS"];

export default function AddTransactionScreen() {
  const addCashTransaction = useAppStore((s) => s.addCashTransaction);

  const [txType, setTxType] = useState<TransactionType>("income");
  const [amountNum, setAmountNum] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Tunai");
  const [txDate, setTxDate] = useState<Date>(() => new Date());
  const [notes, setNotes] = useState("");
  const [proofUri, setProofUri] = useState<string | null>(null);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [methodModalOpen, setMethodModalOpen] = useState(false);

  const isIncome = txType === "income";
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const todayDateKey = toLocalDateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayDateKey = toLocalDateKey(yesterdayDate);
  const selectedDateKey = toLocalDateKey(txDate);

  const shiftDate = (days: number) => {
    setTxDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + days);
      return next;
    });
  };

  const selectPresetDate = (daysOffset: number) => {
    const next = new Date();
    next.setDate(next.getDate() + daysOffset);
    setTxDate(next);
  };

  const handleSwitchType = (nextType: TransactionType) => {
    setTxType(nextType);
    setCategory(nextType === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  };

  const handlePickProof = async () => {
    await withAutoLockSuppressed(async () => {
      try {
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          quality: 0.7,
        });
        if (!res.canceled && res.assets?.[0]?.uri) {
          setProofUri(res.assets[0].uri);
        }
      } catch {
        showDialog({
          tone: "warning",
          title: "Tidak dapat membuka galeri",
          message: "Pastikan izin akses foto diberikan.",
        });
      }
    });
  };

  const handleSave = async () => {
    if (amountNum <= 0) {
      showDialog({
        tone: "warning",
        title: "Nominal belum diisi",
        message: "Masukkan nominal transaksi lebih dari Rp0.",
      });
      return;
    }
    if (!title.trim()) {
      showDialog({
        tone: "warning",
        title: "Nama transaksi kosong",
        message: "Masukkan keterangan atau judul transaksi.",
      });
      return;
    }

    await addCashTransaction({
      type: txType,
      amount: amountNum,
      title: title.trim(),
      category,
      paymentMethod,
      transactionDate: txDate.toISOString(),
      notes: notes.trim(),
      proofUri,
    });

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tambah transaksi</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.segmentContainer}>
            <TouchableOpacity activeOpacity={0.85} style={[styles.segmentButton, isIncome && styles.segmentButtonActiveIncome]} onPress={() => handleSwitchType("income")}>
              <Ionicons name="arrow-down" size={16} color={isIncome ? colors.income : colors.textSecondary} />
              <Text style={[styles.segmentText, isIncome && { color: colors.income, fontWeight: "700" }]}>Pemasukan</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} style={[styles.segmentButton, !isIncome && styles.segmentButtonActiveExpense]} onPress={() => handleSwitchType("expense")}>
              <Ionicons name="arrow-up" size={16} color={!isIncome ? colors.expense : colors.textSecondary} />
              <Text style={[styles.segmentText, !isIncome && { color: colors.expense, fontWeight: "700" }]}>Pengeluaran</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.nominalCard,
              {
                backgroundColor: isIncome ? colors.incomeBg : colors.expenseBg,
              },
            ]}
          >
            <Text style={[styles.nominalLabel, { color: isIncome ? colors.income : colors.expense }]}>Nominal</Text>
            <View style={styles.nominalInputRow}>
              <Text style={[styles.nominalPrefix, { color: isIncome ? colors.income : colors.expense }]}>Rp</Text>
              <TextInput
                style={[styles.nominalInput, { color: isIncome ? colors.income : colors.expense }]}
                value={formatDigitsWithDots(amountNum)}
                onChangeText={(txt) => setAmountNum(parseRupiahInput(txt))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={isIncome ? "rgba(13,138,82,0.4)" : "rgba(169,68,66,0.4)"}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nama transaksi</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder={isIncome ? "Pemasukan kas" : "Belanja deterjen"} placeholderTextColor={colors.textMuted} />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Kategori</Text>
            <TouchableOpacity activeOpacity={0.75} style={styles.selectBox} onPress={() => setCategoryModalOpen(true)}>
              <Text style={styles.selectValue}>{category}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.rowBetween}>
              <Text style={[styles.label, { marginBottom: 0 }]}>Tanggal</Text>
              <View style={styles.quickDateRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.quickDatePill, selectedDateKey === todayDateKey && styles.quickDatePillActive]}
                  onPress={() => selectPresetDate(0)}
                >
                  <Text style={[styles.quickDateText, selectedDateKey === todayDateKey && styles.quickDateTextActive]}>Hari ini</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.quickDatePill, selectedDateKey === yesterdayDateKey && styles.quickDatePillActive]}
                  onPress={() => selectPresetDate(-1)}
                >
                  <Text style={[styles.quickDateText, selectedDateKey === yesterdayDateKey && styles.quickDateTextActive]}>Kemarin</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.dateStepperBox}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.dateStepBtn}
                onPress={() => shiftDate(-1)}
                accessibilityLabel="Mundurkan satu hari"
              >
                <Ionicons name="chevron-back" size={18} color={colors.primary} />
              </TouchableOpacity>
              <View style={styles.dateCenterWrap}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.dateValueText} numberOfLines={1}>
                  {formatDateMedium(txDate)}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.dateStepBtn}
                onPress={() => shiftDate(1)}
                accessibilityLabel="Majukan satu hari"
              >
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Metode</Text>
            <TouchableOpacity activeOpacity={0.75} style={styles.selectBox} onPress={() => setMethodModalOpen(true)}>
              <Text style={styles.selectValue} numberOfLines={1}>
                {paymentMethod}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Catatan</Text>
            <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} multiline placeholder="Opsional" placeholderTextColor={colors.textMuted} />
          </View>

          <TouchableOpacity activeOpacity={0.75} style={styles.proofBox} onPress={handlePickProof}>
            <View style={styles.proofLeft}>
              <Ionicons name={proofUri ? "checkmark-circle" : "image-outline"} size={20} color={colors.primary} />
              <Text style={styles.proofText}>{proofUri ? "Foto bukti terlampir" : "Lampirkan foto bukti"}</Text>
            </View>
            <Text style={styles.proofOptional}>{proofUri ? "Ganti" : "Opsional"}</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Simpan transaksi</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={categoryModalOpen} transparent animationType="fade" onRequestClose={() => setCategoryModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCategoryModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Kategori</Text>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.optionRow, category === cat && styles.optionRowActive]}
                onPress={() => {
                  setCategory(cat);
                  setCategoryModalOpen(false);
                }}
              >
                <Text style={[styles.optionText, category === cat && styles.optionTextActive]}>{cat}</Text>
                {category === cat && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={methodModalOpen} transparent animationType="fade" onRequestClose={() => setMethodModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMethodModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Metode pembayaran</Text>
            {PAYMENT_METHODS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.optionRow, paymentMethod === m && styles.optionRowActive]}
                onPress={() => {
                  setPaymentMethod(m);
                  setMethodModalOpen(false);
                }}
              >
                <Text style={[styles.optionText, paymentMethod === m && styles.optionTextActive]}>{m}</Text>
                {paymentMethod === m && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
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
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.4,
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#EDF1F7",
    borderRadius: radius.lg,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: radius.md,
  },
  segmentButtonActiveIncome: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.incomeBorder,
  },
  segmentButtonActiveExpense: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.expenseBorder,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  nominalCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  nominalLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  nominalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  nominalPrefix: {
    fontSize: 34,
    fontWeight: "800",
  },
  nominalInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: "800",
    paddingVertical: 0,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
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
  textArea: {
    minHeight: 76,
    textAlignVertical: "top",
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "500",
    flex: 1,
    marginRight: 6,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  quickDateRow: {
    flexDirection: "row",
    gap: 6,
  },
  quickDatePill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  quickDatePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  quickDateTextActive: {
    color: "#FFFFFF",
  },
  dateStepperBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dateStepBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCenterWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dateValueText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  proofBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: spacing.xl,
  },
  proofLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  proofText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  proofOptional: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.elevated,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  optionRowActive: {
    backgroundColor: colors.primarySoft,
  },
  optionText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  optionTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
});
