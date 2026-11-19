import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Linking, Platform } from 'react-native';
import { BusinessSettings, CashTransaction, LaundryOrder } from '../db/database';
import { showDialog } from '../components/AppDialog';
import { formatDateLong, formatDateShortWithTime, formatRupiah } from './format';
import { withAutoLockSuppressed } from './security';

export function buildReceiptHtml(order: LaundryOrder, settings: BusinessSettings): string {
  const itemsHtml = (order.items || [])
    .map(
      (it) => `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px dashed #CBD5E1;">
          <div style="font-weight: 600; color: #0F1C35;">${it.service_name}</div>
          <div style="font-size: 12px; color: #64748B;">${it.qty} ${it.unit} × ${formatRupiah(it.price_per_unit)}</div>
        </td>
        <td style="padding: 6px 0; border-bottom: 1px dashed #CBD5E1; text-align: right; font-weight: 600; color: #0F1C35;">
          ${formatRupiah(it.subtotal)}
        </td>
      </tr>
    `
    )
    .join('');

  const remaining = Math.max(0, order.total_amount - order.paid_amount);
  const statusBadgeColor = order.payment_status === 'lunas' ? '#0D8A52' : '#B45309';
  const statusLabel =
    order.payment_status === 'lunas'
      ? 'LUNAS'
      : order.payment_status === 'dp'
        ? `DP (${formatRupiah(order.paid_amount)})`
        : 'BELUM LUNAS';

  const contactLine = [settings.address, settings.phone]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(' • ');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #F6F8FB;
            padding: 24px;
            color: #0F1C35;
          }
          .receipt-card {
            max-width: 380px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 4px 14px rgba(15, 28, 53, 0.08);
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #E2E8F0;
            padding-bottom: 14px;
            margin-bottom: 14px;
          }
          .brand {
            font-size: 20px;
            font-weight: 800;
            color: #0F1C35;
          }
          .sub {
            font-size: 12px;
            color: #64748B;
            margin-top: 4px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 13px;
            margin-bottom: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
          }
          .total-section {
            border-top: 2px solid #0F1C35;
            padding-top: 10px;
            margin-top: 8px;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 700;
            color: #FFFFFF;
            background: ${statusBadgeColor};
          }
          .footer {
            margin-top: 18px;
            text-align: center;
            font-size: 12px;
            color: #64748B;
          }
          .app-credit {
            margin-top: 14px;
            padding-top: 10px;
            border-top: 1px dashed #E2E8F0;
            text-align: center;
            font-size: 11px;
            color: #94A3B8;
          }
          .app-credit strong {
            color: #2358D0;
          }
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <div class="header">
            <div class="brand">${settings.shopName}</div>
            ${settings.tagline ? `<div class="sub">${settings.tagline}</div>` : ''}
            ${contactLine ? `<div class="sub">${contactLine}</div>` : ''}
          </div>

          <div class="meta-row">
            <span style="color:#64748B;">No. Nota</span>
            <strong>${order.order_code}</strong>
          </div>
          <div class="meta-row">
            <span style="color:#64748B;">Pelanggan</span>
            <strong>${order.customer_name}</strong>
          </div>
          <div class="meta-row">
            <span style="color:#64748B;">Tanggal Masuk</span>
            <span>${formatDateShortWithTime(order.created_at)}</span>
          </div>
          <div class="meta-row">
            <span style="color:#64748B;">Estimasi Selesai</span>
            <span>${formatDateShortWithTime(order.estimated_done_at)}</span>
          </div>

          <table>
            ${itemsHtml}
          </table>

          <div class="total-section">
            ${
              order.discount_amount > 0
                ? `<div class="meta-row"><span>Subtotal</span><span>${formatRupiah(order.subtotal)}</span></div>
                   <div class="meta-row" style="color:#0D8A52;"><span>Diskon</span><span>−${formatRupiah(order.discount_amount)}</span></div>`
                : ''
            }
            <div class="meta-row" style="font-size: 16px; font-weight: 800; margin-top: 4px;">
              <span>Total Tagihan</span>
              <span style="color:#2358D0;">${formatRupiah(order.total_amount)}</span>
            </div>
            <div class="meta-row" style="margin-top: 6px;">
              <span>Metode Bayar</span>
              <span>${order.payment_method}</span>
            </div>
            <div class="meta-row" style="align-items: center; margin-top: 6px;">
              <span>Status Bayar</span>
              <span class="badge">${statusLabel}</span>
            </div>
            ${
              remaining > 0
                ? `<div class="meta-row" style="color:#A94442; font-weight:700; margin-top:6px;">
                     <span>Sisa Tagihan</span>
                     <span>${formatRupiah(remaining)}</span>
                   </div>`
                : ''
            }
          </div>

          ${
            order.notes
              ? `<div style="margin-top: 12px; padding: 8px 10px; background: #F1F5F9; border-radius: 8px; font-size: 12px;">
                   <strong>Catatan:</strong> ${order.notes}
                 </div>`
              : ''
          }

          ${
            settings.receiptFooter
              ? `<div class="footer">${settings.receiptFooter}</div>`
              : ''
          }
          <div class="app-credit">
            Dicetak dengan aplikasi <strong>CaNdry</strong>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function exportReceiptPdf(
  order: LaundryOrder,
  settings: BusinessSettings
): Promise<void> {
  await withAutoLockSuppressed(async () => {
    try {
      const html = buildReceiptHtml(order, settings);
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
        return;
      }
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Struk ${order.order_code} - ${order.customer_name}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        showDialog({
          tone: 'success',
          title: 'Struk tersimpan',
          message: `File PDF disimpan di: ${uri}`,
        });
      }
    } catch (err: any) {
      showDialog({
        tone: 'danger',
        title: 'Gagal export struk',
        message: err?.message || 'Terjadi kesalahan saat membuat PDF.',
      });
    }
  });
}

export async function sendOrderWhatsApp(
  order: LaundryOrder,
  settings: BusinessSettings
): Promise<void> {
  const itemsText = (order.items || [])
    .map((it) => `• ${it.service_name}: ${it.qty} ${it.unit} (${formatRupiah(it.subtotal)})`)
    .join('\n');

  const remaining = Math.max(0, order.total_amount - order.paid_amount);
  const payLine =
    order.payment_status === 'lunas'
      ? `LUNAS (${order.payment_method})`
      : `Belum Lunas • Sisa ${formatRupiah(remaining)}`;

  const statusText =
    order.status === 'selesai'
      ? 'Cucian Anda sudah *SELESAI* dan siap diambil.'
      : order.status === 'diambil'
        ? 'Terima kasih, cucian sudah diambil.'
        : `Status cucian saat ini: *${order.status.toUpperCase()}*.`;

  const contactHeader = [settings.address, settings.phone]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(' • ');

  const headerBlock = [
    `*${settings.shopName}*`,
    settings.tagline ? settings.tagline : '',
    contactHeader,
  ]
    .filter(Boolean)
    .join('\n');

  const footerBlock = settings.receiptFooter ? `\n${settings.receiptFooter}` : '';

  const message = `${headerBlock}\n\nNota: *${order.order_code}*\nPelanggan: ${order.customer_name}\n\n${itemsText}\n\nTotal: *${formatRupiah(order.total_amount)}*\nPembayaran: ${payLine}\n\n${statusText}${footerBlock}\n_Dicetak dengan CaNdry_`;

  let phoneClean = (order.customer_phone || '').replace(/[^\d]/g, '');
  if (phoneClean.startsWith('0')) {
    phoneClean = `62${phoneClean.slice(1)}`;
  }

  const encoded = encodeURIComponent(message);
  const url = phoneClean
    ? `https://wa.me/${phoneClean}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  await withAutoLockSuppressed(async () => {
    try {
      await Linking.openURL(url);
    } catch {
      showDialog({
        tone: 'warning',
        title: 'Tidak dapat membuka WhatsApp',
        message: 'Pastikan aplikasi WhatsApp sudah terpasang di HP Anda.',
      });
    }
  });
}

export async function exportReportPdf(params: {
  periodTitle: string;
  settings: BusinessSettings;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  categoryBreakdown: { category: string; amount: number; percentage: number }[];
  transactions: CashTransaction[];
}): Promise<void> {
  const {
    periodTitle,
    settings,
    totalIncome,
    totalExpense,
    netCashflow,
    categoryBreakdown,
    transactions,
  } = params;

  const catRows = categoryBreakdown
    .map(
      (c) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0;">${c.category}</td>
        <td style="padding: 8px 0; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: 600;">${formatRupiah(c.amount)} (${c.percentage}%)</td>
      </tr>
    `
    )
    .join('');

  const txRows = transactions
    .slice(0, 100)
    .map(
      (t) => `
      <tr>
        <td style="padding: 6px 4px; border-bottom: 1px solid #F1F5F9; font-size: 12px;">${formatDateLong(t.transaction_date)}</td>
        <td style="padding: 6px 4px; border-bottom: 1px solid #F1F5F9; font-size: 12px;">
          <strong>${t.title}</strong><br/>
          <span style="color:#64748B;">${t.category} • ${t.payment_method}</span>
        </td>
        <td style="padding: 6px 4px; border-bottom: 1px solid #F1F5F9; text-align: right; font-weight: 700; color: ${
          t.type === 'income' ? '#0D8A52' : '#A94442'
        }; font-size: 12px;">
          ${t.type === 'income' ? '+' : '−'}${formatRupiah(t.amount)}
        </td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 28px; color: #0F1C35; }
          h1 { color: #2358D0; margin-bottom: 4px; font-size: 22px; }
          .subtitle { color: #64748B; font-size: 13px; margin-bottom: 20px; }
          .summary-grid { display: flex; gap: 12px; margin-bottom: 24px; }
          .card { flex: 1; padding: 14px; border-radius: 12px; border: 1px solid #E2E8F0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        </style>
      </head>
      <body>
        <h1>Laporan Arus Kas • ${settings.shopName}</h1>
        <div class="subtitle">Periode: ${periodTitle} • Dicetak ${formatDateLong(new Date())}</div>

        <div class="summary-grid">
          <div class="card" style="background:#EBF1FF;">
            <div style="font-size:12px; color:#64748B;">Arus Kas Bersih</div>
            <div style="font-size:20px; font-weight:800; color:#2358D0; margin-top:4px;">
              ${formatRupiah(netCashflow, { showPlus: true })}
            </div>
          </div>
          <div class="card">
            <div style="font-size:12px; color:#64748B;">Total Pemasukan</div>
            <div style="font-size:18px; font-weight:700; color:#0D8A52; margin-top:4px;">
              ${formatRupiah(totalIncome)}
            </div>
          </div>
          <div class="card">
            <div style="font-size:12px; color:#64748B;">Total Pengeluaran</div>
            <div style="font-size:18px; font-weight:700; color:#A94442; margin-top:4px;">
              ${formatRupiah(totalExpense)}
            </div>
          </div>
        </div>

        <h3 style="margin-bottom:6px;">Pemasukan per Kategori</h3>
        <table>${catRows || '<tr><td>Belum ada data</td></tr>'}</table>

        <h3 style="margin-top:24px; margin-bottom:6px;">Rincian Transaksi</h3>
        <table>${txRows || '<tr><td>Belum ada transaksi</td></tr>'}</table>
      </body>
    </html>
  `;

  try {
    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return;
    }
    const { uri } = await Print.printToFileAsync({ html });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Laporan ${settings.shopName} - ${periodTitle}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      showDialog({
        tone: 'success',
        title: 'Laporan tersimpan',
        message: `File PDF disimpan di: ${uri}`,
      });
    }
  } catch (err: any) {
    showDialog({
      tone: 'danger',
      title: 'Gagal unduh laporan',
      message: err?.message || 'Terjadi kesalahan saat membuat PDF.',
    });
  }
}
