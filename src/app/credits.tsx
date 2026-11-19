import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showDialog } from '../components/AppDialog';
import { BrandWordmark } from '../components/BrandWordmark';
import { withAutoLockSuppressed } from '../lib/security';
import { colors, radius, shadows, spacing, type } from '../theme/tokens';

const REPO_URL = 'https://github.com/pengikut-raja-capybara/capybara-laundry';
const CREATOR_EMAIL = 'anggaalfiansah26@gmail.com';

export default function CreditsScreen() {
  const handleOpenUrl = async (url: string, fallbackTitle: string) => {
    await withAutoLockSuppressed(async () => {
      try {
        await Linking.openURL(url);
      } catch {
        showDialog({
          tone: 'info',
          title: fallbackTitle,
          message: url,
        });
      }
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
        <Text style={styles.headerTitle} numberOfLines={1}>
          Tentang Aplikasi
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Brand Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroOrbLeft} />
          <View style={styles.heroOrbRight} />

          <View style={styles.mascotRing}>
            <View style={styles.mascotFrame}>
              <Image
                source={require('../../assets/images/capybara-hero.jpg')}
                style={styles.mascotImage}
                resizeMode="cover"
              />
            </View>
          </View>

          <BrandWordmark size="lg" />
          <Text style={styles.heroTagline}>Capybara Laundry POS</Text>

          <View style={styles.versionBadge}>
            <Ionicons name="sparkles" size={13} color={colors.primary} />
            <Text style={styles.versionText}>Versi 1.0.0</Text>
          </View>
        </View>

        {/* Tentang Aplikasi Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tentang Aplikasi</Text>
          <Text style={styles.cardDesc}>
            CaNdry adalah aplikasi kasir (POS) dan pembukuan arus kas laundry yang dirancang ringan, cepat, serta bekerja sepenuhnya offline di perangkat Anda.
          </Text>

          <View style={styles.featureGrid}>
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Penyimpanan Lokal Aman</Text>
                <Text style={styles.featureSub}>
                  Database tersimpan langsung di perangkat dengan proteksi kata sandi.
                </Text>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: colors.incomeBg }]}>
                <Ionicons name="receipt-outline" size={18} color={colors.income} />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>Nota & Pembukuan Otomatis</Text>
                <Text style={styles.featureSub}>
                  Setiap pembayaran cucian tercatat otomatis ke laporan arus kas.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tim Pengembang & Kredit Card (Stacked rows so nothing overflows) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Kredit & Pengembang</Text>

          <View style={styles.infoItem}>
            <View style={styles.infoIconBox}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Kreator</Text>
              <Text style={styles.infoValue}>Angga Alfiansah</Text>
            </View>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.infoItem}>
            <View style={styles.infoIconBox}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Tim Pengembang</Text>
              <Text style={styles.infoValue}>Pengikut Raja Capybara</Text>
            </View>
          </View>

          <View style={styles.metaDivider} />

          <View style={styles.infoItem}>
            <View style={styles.infoIconBox}>
              <Ionicons name="logo-google-playstore" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Publisher Play Store</Text>
              <Text style={styles.infoValue}>ANGSA Development Studio</Text>
            </View>
          </View>

          <View style={styles.metaDivider} />

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.infoItem}
            onPress={() =>
              handleOpenUrl(`mailto:${CREATOR_EMAIL}`, 'Email Kreator')
            }
          >
            <View style={styles.infoIconBox}>
              <Ionicons name="mail-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email Kontak</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>
                {CREATOR_EMAIL}
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.metaDivider} />

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.infoItem}
            onPress={() => handleOpenUrl(REPO_URL, 'Repository GitHub')}
          >
            <View style={styles.infoIconBox}>
              <Ionicons name="logo-github" size={18} color={colors.textPrimary} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Repository GitHub</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>
                pengikut-raja-capybara/capybara-laundry
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Promo / Collaboration & Learning Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoOrb} />

          <View style={styles.promoHeaderRow}>
            <View style={styles.promoBadgeIcon}>
              <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>
                Kustomisasi & Belajar Buat Aplikasi
              </Text>
              <Text style={styles.promoTag}>
                Open Source • Jasa Dev • Mentoring
              </Text>
            </View>
          </View>

          <Text style={styles.promoBody}>
            Ingin kustomisasi fitur atau pengembangan lebih lanjut untuk usaha Anda? Silakan fork repository GitHub kami atau hubungi langsung kontak kreator.{'\n\n'}
            Kami juga siap mengajari & membimbing Anda cara membuat aplikasi mobile seperti ini dari awal hingga siap rilis!
          </Text>

          <View style={styles.promoActions}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.promoBtnPrimary}
              onPress={() =>
                handleOpenUrl(
                  `mailto:${CREATOR_EMAIL}?subject=${encodeURIComponent(
                    'Tanya Kustomisasi / Belajar Buat Aplikasi CaNdry'
                  )}`,
                  'Hubungi Kreator'
                )
              }
            >
              <Ionicons name="mail" size={16} color="#FFFFFF" />
              <Text style={styles.promoBtnPrimaryText}>Hubungi Kreator</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.promoBtnSecondary}
              onPress={() => handleOpenUrl(REPO_URL, 'Repository GitHub')}
            >
              <Ionicons name="git-branch-outline" size={16} color={colors.primary} />
              <Text style={styles.promoBtnSecondaryText}>Fork di GitHub</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.copyright}>
          © {new Date().getFullYear()} ANGSA Development Studio • Pengikut Raja Capybara
        </Text>
      </ScrollView>
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
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
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
    ...type.title,
    fontSize: 22,
    color: colors.textPrimary,
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 44,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#EBF0F7',
    overflow: 'hidden',
    ...shadows.card,
  },
  heroOrbLeft: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EBF2FF',
    top: -50,
    left: -40,
  },
  heroOrbRight: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F0F6FF',
    bottom: -35,
    right: -25,
  },
  mascotRing: {
    padding: 5,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.md,
    ...shadows.elevated,
  },
  mascotFrame: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  mascotImage: {
    width: 106,
    height: 106,
  },
  heroTagline: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  versionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#D6E4FF',
  },
  versionText: {
    ...type.caption,
    fontWeight: '700',
    color: colors.primary,
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
    marginBottom: spacing.sm,
  },
  cardDesc: {
    ...type.body,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  featureGrid: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
    flexShrink: 1,
  },
  featureTitle: {
    ...type.bodyStrong,
    fontSize: 14,
    color: colors.textPrimary,
  },
  featureSub: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  infoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
    flexShrink: 1,
  },
  infoLabel: {
    ...type.caption,
    fontSize: 11.5,
    color: colors.textSecondary,
  },
  infoValue: {
    ...type.bodyStrong,
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 1,
  },
  metaDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  promoBanner: {
    backgroundColor: '#EBF2FF',
    borderRadius: radius.xxl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#C7DBFF',
    overflow: 'hidden',
  },
  promoOrb: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(35, 88, 208, 0.08)',
    top: -40,
    right: -35,
  },
  promoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  promoBadgeIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTitle: {
    ...type.section,
    fontSize: 16,
    color: colors.textPrimary,
  },
  promoTag: {
    ...type.caption,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 1,
  },
  promoBody: {
    ...type.body,
    fontSize: 13.5,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  promoActions: {
    flexDirection: 'row',
    gap: 10,
  },
  promoBtnPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  promoBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  promoBtnSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#C7DBFF',
  },
  promoBtnSecondaryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  copyright: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
