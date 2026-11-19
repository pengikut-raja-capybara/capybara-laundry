# Kebijakan Privasi / Privacy Policy — CaNdry (Capybara Laundry)

**Tanggal Berlaku / Effective Date:** 19 November 2026  
**Nama Aplikasi / App Name:** CaNdry — Capybara Laundry POS  
**Package ID:** `com.angsadev.capybaralaundry`  
**Kreator / Creator:** Angga Alfiansah  
**Pengembang / Developer:** Pengikut Raja Capybara  
**Penerbit / Publisher (Google Play):** ANGSA Development Studio  
**Email Kontak / Contact Email:** anggaalfiansah26@gmail.com  
**Repositori Resmi / Official Repository:** https://github.com/pengikut-raja-capybara/capybara-laundry

---

## 🇮🇩 Bahasa Indonesia

### 1. Ringkasan
**CaNdry (Capybara Laundry)** dikembangkan oleh tim **Pengikut Raja Capybara** (Kreator: **Angga Alfiansah**) dan dipublikasikan di Google Play Store oleh **ANGSA Development Studio**. Aplikasi ini adalah aplikasi kasir (POS) dan pembukuan arus kas laundry yang bekerja **100% secara luring (offline)** di perangkat Anda. Kami **tidak mengumpulkan, menyimpan di server, melacak, menjual, atau membagikan data pribadi maupun data usaha Anda** kepada pihak mana pun.

### 2. Pengumpulan dan Penyimpanan Data
- **100% Penyimpanan Lokal (Local-First):** Seluruh data yang Anda catat di dalam aplikasi — termasuk profil usaha laundry, daftar paket harga, data pelanggan, nota cucian, transaksi pemasukan/pengeluaran, dan promo — disimpan **sepenuhnya secara lokal di perangkat Anda** menggunakan database internal SQLite (`expo-sqlite`). Data ini tidak pernah dikirim ke server kami.
- **Keamanan Kata Sandi:** Kata sandi aplikasi disimpan secara lokal dalam bentuk *hash* kriptografi (PBKDF2-SHA256) menggunakan penyimpanan aman perangkat (`expo-secure-store`).
- **Tanpa Analitik & Tanpa Iklan:** Aplikasi ini tidak memuat SDK iklan pihak ketiga, pelacak analitik, maupun layanan telemetri eksternal.

### 3. Izin Perangkat (App Permissions)
Aplikasi ini hanya mengakses fitur perangkat secara opsional ketika Anda memicunya langsung:
- **Galeri Foto (Opsional):** Hanya diakses saat Anda memilih untuk melampirkan foto bukti transaksi pada formulir *Tambah Transaksi*.
- **Berbagi & Pemilihan Berkas (Opsional):** Hanya digunakan saat Anda membagikan foto struk nota (misalnya ke WhatsApp), mengunduh laporan arus kas (PDF), atau mengekspor/memulihkan berkas cadangan data lokal (`.json`).
- **Biometrik Perangkat (Opsional):** Hanya digunakan apabila Anda mengaktifkan fitur buka kunci menggunakan sidik jari/biometrik perangkat.
- Aplikasi ini **tidak** meminta izin lokasi geografis, mikrofon, maupun kontak perangkat.

### 4. Berbagi ke Aplikasi Pihak Ketiga (WhatsApp / Share Sheet)
Ketika Anda menekan tombol **Kirim ke WhatsApp** atau **Bagikan Foto Struk**, aplikasi hanya meneruskan teks rincian nota atau gambar struk ke aplikasi pilihan Anda di perangkat (seperti WhatsApp) atas tindakan eksplisit Anda sendiri. Penggunaan layanan pihak ketiga tersebut tunduk pada kebijakan privasi masing-masing layanan.

### 5. Penghapusan & Pencadangan Data
Karena seluruh data usaha tersimpan secara lokal di perangkat Anda, Anda memiliki kendali penuh atas data tersebut:
1. **Cadangan Mandiri (Backup & Restore):** Anda dapat mengekspor cadangan data (`.json`) kapan saja melalui **Menu → Pengaturan → Data & cadangan**.
2. **Penghapusan Data:** Anda dapat menghapus seluruh data cucian, transaksi, pelanggan, dan promo kapan saja melalui tombol **Reset semua data** di menu **Pengaturan**, atau dengan menghapus data aplikasi (*Clear Storage*) / mencopot pemasangan (*Uninstall*) aplikasi dari perangkat Anda.

### 6. Perubahan Kebijakan Privasi
Jika terdapat pembaruan pada Kebijakan Privasi ini di masa mendatang (misalnya apabila fitur sinkronisasi cloud opsional ditambahkan pada versi berikutnya), perubahan tersebut akan dipublikasikan langsung pada halaman ini di repositori resmi kami.

### 7. Kontak
Jika Anda memiliki pertanyaan mengenai Kebijakan Privasi ini, hubungi kami melalui:
- **Email:** anggaalfiansah26@gmail.com
- **GitHub Issues:** https://github.com/pengikut-raja-capybara/capybara-laundry/issues

---

## 🌐 English Version

### 1. Overview
**CaNdry (Capybara Laundry)** is developed by **Pengikut Raja Capybara** (Creator: **Angga Alfiansah**) and published on Google Play Store by **ANGSA Development Studio**. This application is a laundry Point of Sale (POS) and cashflow bookkeeping app that operates **100% offline** on your device. We **do not collect, transmit, track, sell, or share any personal or business data** with any external server or third party.

### 2. Data Storage & Security
- **100% Local Storage:** All records you enter — including business profile, laundry price packages, customer list, laundry orders/receipts, income/expense cashbook entries, and promos — are stored **exclusively on your device** in a local SQLite database (`expo-sqlite`). None of this data is sent to our servers.
- **Password Protection:** Your app password is stored locally as a salted PBKDF2-SHA256 cryptographic hash inside the device's secure storage (`expo-secure-store`).
- **No Ads & No Trackers:** This application contains zero third-party advertising SDKs, analytics trackers, or telemetry services.

### 3. Device Permissions
Permissions are requested strictly on demand when you explicitly use an optional feature:
- **Photo Library (Optional):** Accessed only when you choose to attach a receipt/proof photo to a cashbook transaction.
- **File Sharing & Document Picker (Optional):** Used only when you share a receipt image, export a PDF financial report, or export/restore a local `.json` backup file.
- **Device Biometrics (Optional):** Used only if you enable fingerprint/biometric app unlock.
- The app **does not** request location, microphone, or contacts permissions.

### 4. Data Deletion & Backups
You have complete control over your local data. You can export a local `.json` backup or wipe all stored records at any time via **Menu → Pengaturan → Reset semua data**, or by clearing app storage / uninstalling the app from your device.

### 5. Contact Us
If you have any questions about this Privacy Policy, please contact us:
- **Email:** anggaalfiansah26@gmail.com
- **GitHub Issues:** https://github.com/pengikut-raja-capybara/capybara-laundry/issues
