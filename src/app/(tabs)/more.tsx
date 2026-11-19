import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
  Alert,
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
import { showDialog } from '../../components/AppDialog';
import { Button, Field, ScreenHeader } from '../../components/ui';
import {
  Customer,
  LaundryService,
  Promo,
  ServiceCategoryType,
  ServiceUnit,
} from '../../db/database';
import { formatDigitsWithDots, formatRupiah, parseRupiahInput } from '../../lib/format';
import { setupAppPassword, withAutoLockSuppressed } from '../../lib/security';
import { PosRepository } from '../../repositories/posRepository';
import { useAppStore } from '../../store/useAppStore';
import { colors, radius, shadows, spacing, type } from '../../theme/tokens';

type SubTab = 'paket' | 'pelanggan' | 'promo' | 'pengaturan';

const SUB_TABS: {
  key: SubTab;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { key: 'paket', label: 'Paket', icon: 'pricetag-outline' },
  { key: 'pelanggan', label: 'Pelanggan', icon: 'people-outline' },
  { key: 'promo', label: 'Promo', icon: 'sparkles-outline' },
  { key: 'pengaturan', label: 'Pengaturan', icon: 'settings-outline' },
];

export default function MoreScreen() {
  const services = useAppStore((s) => s.services);
  const customers = useAppStore((s) => s.customers);
  const promos = useAppStore((s) => s.promos);
  const orders = useAppStore((s) => s.orders);
  const settings = useAppStore((s) => s.settings);

  const saveService = useAppStore((s) => s.saveService);
  const deleteService = useAppStore((s) => s.deleteService);
  const saveCustomer = useAppStore((s) => s.saveCustomer);
  const deleteCustomer = useAppStore((s) => s.deleteCustomer);
  const savePromo = useAppStore((s) => s.savePromo);
  const deletePromo = useAppStore((s) => s.deletePromo);
  const updateBusinessSettings = useAppStore((s) => s.updateBusinessSettings);
  const refreshAll = useAppStore((s) => s.refreshAll);
  const resetAllData = useAppStore((s) => s.resetAllData);

  const [subTab, setSubTab] = useState<SubTab>('paket');

  // Paket Modal & Form State (Add + Edit)
  const [srvModalOpen, setSrvModalOpen] = useState(false);
  const [editingSrvId, setEditingSrvId] = useState<string | undefined>(undefined);
  const [srvName, setSrvName] = useState('');
  const [srvPrice, setSrvPrice] = useState('7000');
  const [srvUnit, setSrvUnit] = useState<ServiceUnit>('kg');
  const [srvCategory] = useState<ServiceCategoryType>('kiloan');
  const [srvDuration, setSrvDuration] = useState('48');

  // Pelanggan Modal & Form State (Add + Edit)
  const [custModalOpen, setCustModalOpen] = useState(false);
  const [editingCustId, setEditingCustId] = useState<string | undefined>(undefined);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custNotes, setCustNotes] = useState('');

  // Promo Modal & Form State (Add + Edit)
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | undefined>(undefined);
  const [promoCode, setPromoCode] = useState('');
  const [promoName, setPromoName] = useState('');
  const [promoType, setPromoType] = useState<'percent' | 'nominal'>('percent');
  const [promoVal, setPromoVal] = useState('10');

  // Pengaturan Form State
  const [shopName, setShopName] = useState(settings.shopName);
  const [shopTagline, setShopTagline] = useState(settings.tagline);
  const [shopPhone, setShopPhone] = useState(settings.phone);
  const [shopAddress, setShopAddress] = useState(settings.address);
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter);
  const [initialBalanceStr, setInitialBalanceStr] = useState(
    String(settings.initialCashBalance || 0)
  );
  const [newPass, setNewPass] = useState('');

  // --- Paket Handlers ---
  const openAddServiceModal = () => {
    setEditingSrvId(undefined);
    setSrvName('');
    setSrvPrice('7000');
    setSrvUnit('kg');
    setSrvDuration('48');
    setSrvModalOpen(true);
  };

  const openEditServiceModal = (srv: LaundryService) => {
    setEditingSrvId(srv.id);
    setSrvName(srv.name);
    setSrvPrice(String(srv.price));
    setSrvUnit(srv.unit);
    setSrvDuration(String(srv.duration_hours));
    setSrvModalOpen(true);
  };

  const handleSaveService = async () => {
    const price = parseRupiahInput(srvPrice);
    if (!srvName.trim() || price <= 0) {
      showDialog({
        tone: 'warning',
        title: 'Data paket belum lengkap',
        message: 'Isi nama paket dan harga lebih dari Rp0.',
      });
      return;
    }
    await saveService({
      id: editingSrvId,
      name: srvName.trim(),
      category: srvCategory,
      unit: srvUnit,
      price,
      duration_hours: parseInt(srvDuration, 10) || 48,
    });
    setSrvModalOpen(false);
  };

  const handleSetDefaultService = async (srv: LaundryService) => {
    await saveService({
      id: srv.id,
      name: srv.name,
      category: srv.category,
      unit: srv.unit,
      price: srv.price,
      duration_hours: srv.duration_hours,
      is_default: 1,
    });
  };

  const handleConfirmDeleteService = (srv: LaundryService) => {
    showDialog({
      tone: 'danger',
      title: 'Hapus paket layanan?',
      message: `Paket "${srv.name}" (${formatRupiah(srv.price)}/${srv.unit}) akan dihapus.`,
      actions: [
        { label: 'Batal', variant: 'ghost' },
        {
          label: 'Hapus',
          variant: 'danger',
          icon: 'trash-outline',
          onPress: () => deleteService(srv.id),
        },
      ],
    });
  };

  // --- Pelanggan Handlers ---
  const openAddCustomerModal = () => {
    setEditingCustId(undefined);
    setCustName('');
    setCustPhone('');
    setCustNotes('');
    setCustModalOpen(true);
  };

  const openEditCustomerModal = (c: Customer) => {
    setEditingCustId(c.id);
    setCustName(c.name);
    setCustPhone(c.phone || '');
    setCustNotes(c.notes || '');
    setCustModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!custName.trim()) {
      showDialog({
        tone: 'warning',
        title: 'Nama pelanggan kosong',
        message: 'Masukkan nama pelanggan terlebih dahulu.',
      });
      return;
    }
    await saveCustomer({
      id: editingCustId,
      name: custName.trim(),
      phone: custPhone.trim(),
      notes: custNotes.trim(),
    });
    setCustModalOpen(false);
  };

  const handleConfirmDeleteCustomer = (c: Customer) => {
    showDialog({
      tone: 'danger',
      title: 'Hapus pelanggan?',
      message: `Data pelanggan "${c.name}" akan dihapus dari daftar.`,
      actions: [
        { label: 'Batal', variant: 'ghost' },
        {
          label: 'Hapus',
          variant: 'danger',
          icon: 'trash-outline',
          onPress: () => deleteCustomer(c.id),
        },
      ],
    });
  };

  // --- Promo Handlers ---
  const openAddPromoModal = () => {
    setEditingPromoId(undefined);
    setPromoCode('');
    setPromoName('');
    setPromoType('percent');
    setPromoVal('10');
    setPromoModalOpen(true);
  };

  const openEditPromoModal = (p: Promo) => {
    setEditingPromoId(p.id);
    setPromoCode(p.code);
    setPromoName(p.name);
    setPromoType(p.discount_type);
    setPromoVal(String(p.discount_value));
    setPromoModalOpen(true);
  };

  const handleSavePromo = async () => {
    const val = parseRupiahInput(promoVal);
    if (!promoCode.trim() || !promoName.trim() || val <= 0) {
      showDialog({
        tone: 'warning',
        title: 'Data promo belum lengkap',
        message: 'Lengkapi kode promo, nama, dan nilai potongan.',
      });
      return;
    }
    await savePromo({
      id: editingPromoId,
      code: promoCode,
      name: promoName,
      discount_type: promoType,
      discount_value: val,
    });
    setPromoModalOpen(false);
  };

  const handleConfirmDeletePromo = (p: Promo) => {
    showDialog({
      tone: 'danger',
      title: 'Hapus kode promo?',
      message: `Promo "${p.code}" (${p.name}) akan dihapus.`,
      actions: [
        { label: 'Batal', variant: 'ghost' },
        {
          label: 'Hapus',
          variant: 'danger',
          icon: 'trash-outline',
          onPress: () => deletePromo(p.id),
        },
      ],
    });
  };

  // --- Pengaturan & Backup Handlers ---
  const handleSaveSettings = async () => {
    await updateBusinessSettings({
      shopName: shopName.trim() || 'Laundry Kita',
      tagline: shopTagline.trim(),
      phone: shopPhone.trim(),
      address: shopAddress.trim(),
      receiptFooter: receiptFooter.trim(),
      initialCashBalance: parseRupiahInput(initialBalanceStr),
    });
    if (newPass.trim().length >= 4) {
      await setupAppPassword(newPass.trim());
      setNewPass('');
    }
    showDialog({
      tone: 'success',
      title: 'Pengaturan disimpan',
      message: 'Profil usaha dan format struk berhasil diperbarui.',
    });
  };

  const handleExportBackup = async () => {
    await withAutoLockSuppressed(async () => {
      try {
        const json = await PosRepository.exportBackupJson();
        if (Platform.OS === 'web') {
          showDialog({
            tone: 'info',
            title: 'Backup Siap',
            message: `Total ${json.length} karakter data siap disimpan.`,
          });
          return;
        }
        const file = new File(Paths.cache, `candry-backup-${Date.now()}.json`);
        file.write(json);
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            mimeType: 'application/json',
            dialogTitle: 'Simpan Backup CaNdry',
          });
        } else {
          showDialog({
            tone: 'success',
            title: 'Backup tersimpan',
            message: `Disimpan di: ${file.uri}`,
          });
        }
      } catch (err: any) {
        showDialog({
          tone: 'danger',
          title: 'Gagal membuat backup',
          message: err?.message || 'Tidak dapat mengekspor file backup.',
        });
      }
    });
  };

  const handleRestoreBackup = async () => {
    await withAutoLockSuppressed(async () => {
      try {
        const picked = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });
        if (picked.canceled || !picked.assets?.[0]?.uri) return;
        const file = new File(picked.assets[0].uri);
        const content = await file.text();
        await PosRepository.restoreBackupJson(content);
        await refreshAll();
        showDialog({
          tone: 'success',
          title: 'Restore berhasil',
          message: 'Seluruh data pelanggan, paket, cucian, dan transaksi berhasil dipulihkan.',
        });
      } catch (err: any) {
        showDialog({
          tone: 'danger',
          title: 'Gagal memulihkan data',
          message: err?.message || 'File backup tidak valid.',
        });
      }
    });
  };

  const handleConfirmResetData = () => {
    showDialog({
      tone: 'danger',
      title: 'Reset semua data?',
      message:
        'Semua transaksi, nota cucian, pelanggan, dan promo akan dihapus. Paket harga dikembalikan ke 1 paket Cuci Kiloan (Rp7.000/kg).',
      actions: [
        { label: 'Batal', variant: 'ghost' },
        {
          label: 'Hapus & Reset',
          variant: 'danger',
          icon: 'trash-outline',
          onPress: async () => {
            await resetAllData();
            showDialog({
              tone: 'success',
              title: 'Data berhasil direset',
              message: 'Seluruh data sudah dibersihkan kembali ke pengaturan awal.',
            });
          },
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScreenHeader
        title="Menu"
        subtitle="Kelola paket, pelanggan, promo & pengaturan"
        icon="grid-outline"
      />

      {/* Fixed Segmented Sub-Tab Control */}
      <View style={styles.fixedSubTabWrap}>
        <View style={styles.segmentedBar}>
          {SUB_TABS.map((t) => {
            const active = subTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                activeOpacity={0.8}
                style={[styles.segmentItem, active && styles.segmentItemActive]}
                onPress={() => setSubTab(t.key)}
              >
                <Ionicons
                  name={t.icon}
                  size={15}
                  color={active ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.segmentText,
                    active && styles.segmentTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* 1. TAB PAKET HARGA */}
        {subTab === 'paket' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Daftar paket ({services.length})
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.addPillBtn}
                onPress={openAddServiceModal}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addPillBtnText}>Tambah paket</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.listStack}>
              {services.map((srv) => (
                <TouchableOpacity
                  key={srv.id}
                  activeOpacity={0.8}
                  style={styles.itemCard}
                  onPress={() => openEditServiceModal(srv)}
                >
                  <View style={styles.itemLeftIcon}>
                    <Ionicons
                      name="shirt-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <View style={styles.itemTitleRow}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {srv.name}
                      </Text>
                      {srv.is_default === 1 && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Utama</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemMeta}>
                      {formatRupiah(srv.price)}/{srv.unit} · {srv.duration_hours} jam
                    </Text>
                  </View>

                  <View style={styles.itemActions}>
                    {srv.is_default !== 1 && (
                      <TouchableOpacity
                        style={styles.starIconBtn}
                        onPress={() => handleSetDefaultService(srv)}
                        accessibilityLabel="Jadikan paket utama"
                      >
                        <Ionicons
                          name="star-outline"
                          size={16}
                          color={colors.warning}
                        />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.editIconBtn}
                      onPress={() => openEditServiceModal(srv)}
                      accessibilityLabel="Edit paket"
                    >
                      <Ionicons
                        name="create-outline"
                        size={17}
                        color={colors.primary}
                      />
                    </TouchableOpacity>

                    {services.length > 1 && (
                      <TouchableOpacity
                        style={styles.trashIconBtn}
                        onPress={() => handleConfirmDeleteService(srv)}
                        accessibilityLabel="Hapus paket"
                      >
                        <Ionicons
                          name="trash-outline"
                          size={17}
                          color={colors.expense}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* 2. TAB PELANGGAN */}
        {subTab === 'pelanggan' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                Pelanggan ({customers.length})
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.addPillBtn}
                onPress={openAddCustomerModal}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addPillBtnText}>Tambah pelanggan</Text>
              </TouchableOpacity>
            </View>

            {customers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="people-outline"
                  size={32}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyText}>
                  Belum ada pelanggan tersimpan.
                </Text>
              </View>
            ) : (
              <View style={styles.listStack}>
                {customers.map((c) => {
                  const orderCount = orders.filter(
                    (o) =>
                      o.customer_id === c.id ||
                      o.customer_name.toLowerCase() === c.name.toLowerCase()
                  ).length;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      activeOpacity={0.8}
                      style={styles.itemCard}
                      onPress={() => openEditCustomerModal(c)}
                    >
                      <View style={styles.itemLeftIcon}>
                        <Ionicons
                          name="person-outline"
                          size={20}
                          color={colors.primary}
                        />
                      </View>

                      <View style={{ flex: 1, marginRight: spacing.sm }}>
                        <Text style={styles.itemTitle} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.itemMeta} numberOfLines={1}>
                          {c.phone || 'Tanpa nomor'} · {orderCount}x cuci
                          {c.notes ? ` · ${c.notes}` : ''}
                        </Text>
                      </View>

                      <View style={styles.itemActions}>
                        <TouchableOpacity
                          style={styles.editIconBtn}
                          onPress={() => openEditCustomerModal(c)}
                          accessibilityLabel="Edit pelanggan"
                        >
                          <Ionicons
                            name="create-outline"
                            size={17}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.trashIconBtn}
                          onPress={() => handleConfirmDeleteCustomer(c)}
                          accessibilityLabel="Hapus pelanggan"
                        >
                          <Ionicons
                            name="trash-outline"
                            size={17}
                            color={colors.expense}
                          />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* 3. TAB PROMO */}
        {subTab === 'promo' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Promo ({promos.length})</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.addPillBtn}
                onPress={openAddPromoModal}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addPillBtnText}>Tambah promo</Text>
              </TouchableOpacity>
            </View>

            {promos.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons
                  name="sparkles-outline"
                  size={32}
                  color={colors.textMuted}
                />
                <Text style={styles.emptyText}>Belum ada kode promo.</Text>
              </View>
            ) : (
              <View style={styles.listStack}>
                {promos.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    activeOpacity={0.8}
                    style={styles.itemCard}
                    onPress={() => openEditPromoModal(p)}
                  >
                    <View style={styles.itemLeftIcon}>
                      <Ionicons
                        name="pricetag-outline"
                        size={20}
                        color={colors.primary}
                      />
                    </View>

                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {p.code} · {p.name}
                      </Text>
                      <Text style={styles.itemMeta}>
                        Potongan{' '}
                        {p.discount_type === 'percent'
                          ? `${p.discount_value}%`
                          : formatRupiah(p.discount_value)}
                      </Text>
                    </View>

                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.editIconBtn}
                        onPress={() => openEditPromoModal(p)}
                        accessibilityLabel="Edit promo"
                      >
                        <Ionicons
                          name="create-outline"
                          size={17}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.trashIconBtn}
                        onPress={() => handleConfirmDeletePromo(p)}
                        accessibilityLabel="Hapus promo"
                      >
                        <Ionicons
                          name="trash-outline"
                          size={17}
                          color={colors.expense}
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 4. TAB PENGATURAN & DATA */}
        {subTab === 'pengaturan' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Profil usaha & struk</Text>

              <Field
                label="Nama laundry"
                value={shopName}
                onChangeText={setShopName}
                placeholder="Nama usaha laundry"
              />
              <Field
                label="Slogan / subjudul struk"
                value={shopTagline}
                onChangeText={setShopTagline}
                placeholder="Bersih, Rapi, Wangi"
              />
              <Field
                label="Telepon / WA"
                value={shopPhone}
                onChangeText={setShopPhone}
                keyboardType="phone-pad"
                placeholder="0812xxxx"
              />
              <Field
                label="Alamat"
                value={shopAddress}
                onChangeText={setShopAddress}
                placeholder="Alamat outlet laundry"
              />
              <Field
                label="Pesan kaki struk"
                value={receiptFooter}
                onChangeText={setReceiptFooter}
                placeholder="Terima kasih telah mencuci di tempat kami."
              />
              <Field
                label="Saldo kas awal (Rp)"
                value={formatDigitsWithDots(initialBalanceStr)}
                onChangeText={(txt) =>
                  setInitialBalanceStr(String(parseRupiahInput(txt)))
                }
                keyboardType="numeric"
                placeholder="0"
              />
              <Field
                label="Ganti kata sandi"
                value={newPass}
                onChangeText={setNewPass}
                secureTextEntry
                placeholder="Kosongkan jika tidak diubah"
              />

              <Button label="Simpan pengaturan" onPress={handleSaveSettings} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Data & cadangan</Text>

              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  style={styles.backupBtn}
                  onPress={handleExportBackup}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.backupBtnText}>Export backup (.json)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.restoreBtn}
                  onPress={handleRestoreBackup}
                >
                  <Ionicons
                    name="cloud-download-outline"
                    size={18}
                    color={colors.income}
                  />
                  <Text style={[styles.backupBtnText, { color: colors.income }]}>
                    Restore dari backup
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resetDangerBtn}
                  onPress={handleConfirmResetData}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.expense}
                  />
                  <Text style={[styles.backupBtnText, { color: colors.expense }]}>
                    Reset semua data
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL TAMBAH / EDIT PAKET */}
      <Modal
        visible={srvModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSrvModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setSrvModalOpen(false)}
          >
            <Pressable
              style={styles.modalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingSrvId ? 'Edit paket' : 'Tambah paket'}
                </Text>
                <TouchableOpacity onPress={() => setSrvModalOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Field
                label="Nama paket"
                value={srvName}
                onChangeText={setSrvName}
                placeholder="Cuci Kiloan / Express"
              />

              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Harga (Rp)"
                    value={formatDigitsWithDots(srvPrice)}
                    onChangeText={(txt) =>
                      setSrvPrice(String(parseRupiahInput(txt)))
                    }
                    keyboardType="numeric"
                    placeholder="7.000"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Durasi (jam)"
                    value={srvDuration}
                    onChangeText={setSrvDuration}
                    keyboardType="numeric"
                    placeholder="48"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Satuan</Text>
              <View style={styles.chipRow}>
                {(['kg', 'pcs', 'pasang', 'meter'] as const).map((u) => {
                  const active = srvUnit === u;
                  return (
                    <TouchableOpacity
                      key={u}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setSrvUnit(u)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Button
                label={editingSrvId ? 'Simpan perubahan' : 'Simpan paket'}
                onPress={handleSaveService}
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL TAMBAH / EDIT PELANGGAN */}
      <Modal
        visible={custModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setCustModalOpen(false)}
          >
            <Pressable
              style={styles.modalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingCustId ? 'Edit pelanggan' : 'Tambah pelanggan'}
                </Text>
                <TouchableOpacity onPress={() => setCustModalOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Field
                label="Nama pelanggan"
                value={custName}
                onChangeText={setCustName}
                placeholder="Nama pelanggan"
              />
              <Field
                label="Nomor WhatsApp"
                value={custPhone}
                onChangeText={setCustPhone}
                keyboardType="phone-pad"
                placeholder="0812xxxx"
              />
              <Field
                label="Catatan"
                value={custNotes}
                onChangeText={setCustNotes}
                placeholder="Opsional"
              />

              <Button
                label={editingCustId ? 'Simpan perubahan' : 'Simpan pelanggan'}
                onPress={handleSaveCustomer}
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL TAMBAH / EDIT PROMO */}
      <Modal
        visible={promoModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPromoModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={styles.backdrop}
            onPress={() => setPromoModalOpen(false)}
          >
            <Pressable
              style={styles.modalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingPromoId ? 'Edit promo' : 'Tambah promo'}
                </Text>
                <TouchableOpacity onPress={() => setPromoModalOpen(false)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Field
                label="Kode promo"
                value={promoCode}
                onChangeText={setPromoCode}
                autoCapitalize="characters"
                placeholder="HEMAT10"
              />
              <Field
                label="Nama promo"
                value={promoName}
                onChangeText={setPromoName}
                placeholder="Diskon 10%"
              />

              <Text style={styles.fieldLabel}>Jenis potongan</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    promoType === 'percent' && styles.chipActive,
                  ]}
                  onPress={() => setPromoType('percent')}
                >
                  <Text
                    style={[
                      styles.chipText,
                      promoType === 'percent' && styles.chipTextActive,
                    ]}
                  >
                    Persen (%)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    promoType === 'nominal' && styles.chipActive,
                  ]}
                  onPress={() => setPromoType('nominal')}
                >
                  <Text
                    style={[
                      styles.chipText,
                      promoType === 'nominal' && styles.chipTextActive,
                    ]}
                  >
                    Nominal (Rp)
                  </Text>
                </TouchableOpacity>
              </View>

              <Field
                label={`Nilai potongan (${promoType === 'percent' ? '%' : 'Rp'})`}
                value={
                  promoType === 'nominal'
                    ? formatDigitsWithDots(promoVal)
                    : promoVal
                }
                onChangeText={(txt) =>
                  setPromoVal(String(parseRupiahInput(txt)))
                }
                keyboardType="numeric"
                placeholder="10"
              />

              <Button
                label={editingPromoId ? 'Simpan perubahan' : 'Simpan promo'}
                onPress={handleSavePromo}
              />
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
    paddingBottom: 40,
  },
  fixedSubTabWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  segmentedBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 9,
    paddingHorizontal: 2,
    borderRadius: radius.md,
  },
  segmentItemActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...type.section,
    color: colors.textPrimary,
  },
  addPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    ...shadows.elevated,
  },
  addPillBtnText: {
    ...type.label,
    color: '#FFFFFF',
  },
  listStack: {
    gap: spacing.sm,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBF0F7',
    ...shadows.card,
  },
  itemLeftIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  itemMeta: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  defaultBadge: {
    backgroundColor: colors.incomeBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.income,
  },
  starIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trashIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.expenseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    ...type.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#EBF0F7',
    ...shadows.card,
  },
  cardTitle: {
    ...type.section,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    ...type.label,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    ...type.label,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  backupBtn: {
    backgroundColor: '#E8EFFC',
    paddingVertical: 13,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  restoreBtn: {
    backgroundColor: colors.incomeBg,
    paddingVertical: 13,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetDangerBtn: {
    backgroundColor: colors.expenseBg,
    paddingVertical: 13,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backupBtnText: {
    ...type.label,
    color: colors.primary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    ...shadows.elevated,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...type.section,
    color: colors.textPrimary,
  },
});
