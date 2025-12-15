
# 🚀 Cara Deploy Backend ke Railway & Frontend ke Vercel

Panduan ini akan membantu Anda mengonlinekan aplikasi TikTok Spin Anda.

## 1. Persiapan GitHub (Penting!)
Pastikan semua kode Anda sudah di-push ke repository GitHub.
- Struktur folder harus tetap seperti sekarang:
  - `backend/` (untuk Logic Server & WebSocket)
  - `app/` (untuk Frontend Next.js)

---

## 2. Deploy Backend ke Railway (Server)

Railway akan menjalankan logic game dan koneksi ke TikTok.

1.  Buka [Railway.app](https://railway.app/) dan Login (bisa pakai GitHub).
2.  Klik **+ New Project** > **Deploy from GitHub repo**.
3.  Pilih repository project Anda.
4.  **SANGAT PENTING**: Konfigurasi Root Directory.
    - Setelah project dibuat, klik box/card service project Anda.
    - Pergi ke tab **Settings**.
    - Scroll ke bagian **Root Directory**.
    - Ubah menjadi `/backend` (atau cukup ketik `backend`).
    - Ini memberi tahu Railway untuk masuk ke folder backend sebelum menjalankan perintah.
    - Railway akan otomatis mendeteksi Node.js dan menjalankan `npm install` & `npm start`.
5.  **Generate Domain (URL)**:
    - Masih di service backend, pergi ke tab **Settings** > **Networking**.
    - Klik **Generate Domain**.
    - Anda akan mendapat URL seperti: `tiktok-spin-production.up.railway.app`.
    - **Salin URL ini**. Ini adalah `BACKEND_URL` Anda.

**⚠️ Catatan tentang Data Hilang (Persistence):**
Karena Railway menggunakan sistem file ephemeral, data file `winners.json` dan `prize-config.json` akan **ter-reset** (hilang) setiap kali server restart atau redeploy.
- Untuk project serius, disarankan menggunakan Database (PostgreSQL/Redis) yang tersedia di Railway (Add Service > Database).
- Untuk saat ini, Anda bisa lanjut saja, tapi ingat settingan hadiah akan kembali ke default jika server mati.

---

## 3. Deploy Frontend ke Vercel (Tampilan)

Vercel akan menjalankan tampilan website (Overlay).

1.  Buka [Vercel.com](https://vercel.com/) dan Login.
2.  Klik **Add New...** > **Project**.
3.  Import repository GitHub yang sama.
4.  **Environment Variables**:
    - Di halaman konfigurasi "Configure Project", cari bagian **Environment Variables**.
    - Tambahkan variable berikut:
      - **Name**: `NEXT_PUBLIC_BACKEND_URL`
      - **Value**: Masukkan URL Railway yang tadi disalin (Contoh: `https://tiktok-spin-production.up.railway.app`). **Jangan pakai slash (/) di akhir**.
      - **Name**: `NEXT_PUBLIC_WS_URL`
      - **Value**: Masukkan URL Railway tapi ganti `https` dengan `wss` (Contoh: `wss://tiktok-spin-production.up.railway.app`).
5.  Klik **Deploy**.

---

## 4. Finalisasi

1.  Buka URL Frontend (Vercel) Anda (misal: `https://project-kamu.vercel.app/dashboard`).
2.  Masuk ke halaman Dashboard/Admin.
3.  Cek status di pojok: Harusnya "Terhubung ke TikTok" (jika backend Railway sukses connect).
4.  Upload gambar hadiah baru: Gambar akan tersimpan di server Railway sementara.

Selamat mencoba!
