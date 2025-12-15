
# 🚀 Cara Deploy Backend ke Railway & Frontend ke Vercel

Panduan ini akan membantu Anda mengonlinekan aplikasi TikTok Spin Anda.

## 1. Persiapan GitHub (Penting!)
Pastikan semua kode Anda sudah di-push ke repository GitHub.
- Struktur folder harus tetap seperti sekarang:
  - `backend/` (untuk Logic Server & WebSocket)
  - `app/` (untuk Frontend Next.js)

---

## 2. Deploy Backend ke Railway (Server)

**STATUS: SUDAH SELESAI ✅**
URL Backend Anda: `https://bckend-production-7f49.up.railway.app`

---

## 3. Deploy Frontend ke Vercel (Tampilan)

Vercel akan menjalankan tampilan website (Overlay).

1.  Buka [Vercel.com](https://vercel.com/) dan Login.
2.  Klik **Add New...** > **Project**.
3.  Import repository GitHub `bckend`.
4.  **Environment Variables**:
    - Di halaman konfigurasi "Configure Project", cari bagian **Environment Variables**.
    - Tambahkan variable berikut:
      - **Name**: `NEXT_PUBLIC_BACKEND_URL`
      - **Value**: `https://bckend-production-7f49.up.railway.app`
      - Klik **Add**.
      
      *(Opsional, kode sudah otomatis mendeteksi WS, tapi boleh ditambahkan jika mau)*
      - **Name**: `NEXT_PUBLIC_WS_URL`
      - **Value**: `wss://bckend-production-7f49.up.railway.app`
5.  Klik **Deploy**.

---

## 4. Finalisasi

1.  Buka URL Frontend (Vercel) Anda (misal: `https://project-kamu.vercel.app/dashboard`).
2.  Masuk ke halaman Dashboard/Admin atau Overlay.
3.  Cek status di pojok: Harusnya "Terhubung ke TikTok" (jika backend Railway sukses connect).
4.  Upload gambar hadiah baru: Gambar akan tersimpan di server Railway sementara.

Selamat mencoba!
