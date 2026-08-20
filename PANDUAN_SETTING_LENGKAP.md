# 📚 PANDUAN SETTING LENGKAP — MIMO 2.5 Kas Digital
## Dari Nol Sampai Deploy Vercel (Tutorial Pemula)

---

## 📋 DAFTAR ISI
1. [Yang Perlu Dipersiapkan](#1-yang-perlu-dipersiapkan)
2. [Install Software di Komputer](#2-install-software-di-komputer)
3. [Clone & Jalankan Project](#3-clone--jalankan-project)
4. [Buat Akun & Project Supabase](#4-buat-akun--project-supabase)
5. [Setting Database Supabase](#5-setting-database-supabase)
6. [Buat Akun Telegram Bot](#6-buat-akun-telegram-bot)
7. [Buat Akun Google Gemini AI](#7-buat-akun-google-gemini-ai)
8. [Buat File .env.local](#8-buat-file-envlocal)
9. [Jalankan di Komputer (Local)](#9-jalankan-di-komputer-local)
10. [Buat Akun GitHub](#10-buat-akun-github)
11. [Upload ke GitHub](#11-upload-ke-github)
12. [Deploy ke Vercel](#12-deploy-ke-vercel)
13. [Setup User Login Pertama](#13-setup-user-login-pertama)
14. [Test Semua Fitur](#14-test-semua-fitur)
15. [Troubleshooting (Masalah Umum)](#15-troubleshooting)

---

## 1. Yang Perlu Dipersiapkan

Sebelum mulai, pastikan kamu punya:
- ✅ **Komputer/Laptop** (Windows, Mac, atau Linux)
- ✅ **Koneksi internet**
- ✅ **Akun email** (untuk daftar Supabase, GitHub, Vercel)
- ✅ **Nomor HP** (untuk verifikasi akun)

**Estimasi waktu: 1-2 jam**

---

## 2. Install Software di Komputer

### 2.1 Install Node.js (WAJIB)
Node.js dibutuhkan untuk menjalankan project ini.

1. Buka **https://nodejs.org**
2. Download versi **LTS** (yang ada tulisan "Recommended")
3. Buka file yang sudah didownload, klik **Next** terus sampai selesai
4. Buka **Terminal** (Windows: tekan `Win+R`, ketik `cmd`, Enter)
5. Ketik perintah ini untuk cek sudah terinstall:
```
node --version
```
Kalau muncul angka seperti `v20.x.x` = ✅ sudah benar

### 2.2 Install Git (WAJIB)
Git untuk menyimpan kode ke GitHub.

1. Buka **https://git-scm.com**
2. Download dan install dengan default settings
3. Ketik di terminal:
```
git --version
```

### 2.3 Install VS Code (RECOMMENDED)
Editor kode gratis dari Microsoft.

1. Buka **https://code.visualstudio.com**
2. Download dan install

---

## 3. Clone & Jalankan Project

### 3.1 Buka Terminal
- **Windows:** Ketik `cmd` di Start Menu
- **Mac:** Ketik `Terminal` di Spotlight
- **Linux:** Ctrl+Alt+T

### 3.2 Clone Project dari GitHub
```bash
# Masuk ke folder Documents (atau folder mana saja)
cd Documents

# Clone project
git clone https://github.com/vaxetherion/mimo-2.5-kas-digital.git

# Masuk ke folder project
cd mimo-2.5-kas-digital

# Install semua package yang dibutuhkan
npm install
```

**Catatan:** Kalau error `git not found`, pastikan Git sudah terinstall (lihat langkah 2.2).

---

## 4. Buat Akun & Project Supabase

Supabase adalah database gratis untuk project ini.

### 4.1 Daftar Supabase
1. Buka **https://supabase.com**
2. Klik **"Start your project"** atau **"Sign Up"**
3. Daftar pakai **GitHub** (paling mudah) atau email
4. Verifikasi email jika diminta

### 4.2 Buat Project Baru
1. Setelah login, klik **"New Project"** (tombol biru)
2. Isi:
   - **Organization:** Pilih atau buat baru (isi apa saja)
   - **Project name:** `mimo-kas-digital`
   - **Database Password:** Buat password yang kuat (CATAT! Simpan di tempat aman!)
   - **Region:** Pilih **Southeast Asia (Singapore)** terdekat
3. Klik **"Create new project"**
4. **Tunggu 1-2 menit** sampai project selesai dibuat

### 4.3 Ambil API Keys
1. Di dashboard project, klik **gear icon (⚙️)** di sidebar kiri → **Configuration** → **API**
2. Catat **DUA hal ini**:

   **Project URL:**
   ```
   https://xxxxxxxxxxxx.supabase.co
   ```
   (format: `https://` + nama project + `.supabase.co`)

   **anon/public key** (bukan service_role!):
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...
   ```
   (panjang, mulai dengan `eyJ`)

---

## 5. Setting Database Supabase

### 5.1 Buka SQL Editor
1. Di dashboard Supabase, klik **SQL Editor** di sidebar kiri
2. Klik **"New query"**

### 5.2 Jalankan Migration 1 — Schema Awal
1. Buka file `supabase/migrations/00001_initial_schema.sql` di project
2. **Copy seluruh isi file**
3. Paste ke SQL Editor di Supabase
4. Klik tombol **"Run"** (▶️) di pojok kanan atas
5. Tunggu sampai muncul tulisan **"Success"**

### 5.3 Jalankan Migration 2 — Wallets
1. Klik **"New query"** lagi
2. Buka file `supabase/migrations/00002_add_wallets.sql`
3. Copy → Paste ke SQL Editor → Run
4. Tunggu sampai Success

### 5.4 Jalankan Migration 3 — Budget Limits
1. Klik **"New query"** lagi
2. Buka file `supabase/migrations/00003_add_budget_limits.sql`
3. Copy → Paste → Run
4. Tunggu sampai Success

### 5.5 Cek Database
Di sidebar kiri, klik **Table Editor**. Harusnya kamu melihat tabel:
- ✅ users
- ✅ categories (sudah ada 6 data default)
- ✅ wallets
- ✅ transactions
- ✅ budget_limits
- ✅ telegram_links
- ✅ backups
- ✅ attachments

**Kalau ada tabel yang kosong atau tidak muncul, ulangi langkah migration.**

---

## 6. Buat Akun Telegram Bot

### 6.1 Buat Bot di Telegram
1. Buka **Telegram** di HP atau PC
2. Cari **@BotFather**
3. Kirim pesan: `/newbot`
4. Ikuti instruksi:
   - Nama bot: `MIMO 2.5 Kas Digital`
   - Username bot: `MIMO25Bot` (atau nama lain yang belum dipakai)
5. BotFather akan memberikan **token**:
   ```
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```
6. **CATAT TOKEN INI!** (jangan share ke siapapun)

### 6.2 Buat Webhook Secret
Ketik di terminal (atau gunakan random string generator):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Catat hasilnya sebagai `TELEGRAM_WEBHOOK_SECRET`.

---

## 7. Buat Akun Google Gemini AI

Untuk fitur **Scan Struk AI**.

### 7.1 Daftar Google AI Studio
1. Buka **https://aistudio.google.com**
2. Login pakai akun Google
3. Klik **"Get API Key"** di sidebar kiri
4. Klik **"Create API key"**
5. Pilih project atau buat baru
6. **Catat API key** yang muncul:
   ```
   AIzaSy...
   ```
7. **_opsional:_ Pastikan model `gemini-2.0-flash` aktif di dashboard**

**Catatan:** Tanpa API key ini, fitur Scan Struk tetap jalan (demo mode), tapi menggunakan data contoh.

---

## 8. Buat File .env.local

### 8.1 Buat File
Buat file bernama `.env.local` di **root folder project** (satu folder dengan `package.json`).

**Cara membuat:**
- **VS Code:** Klik kanan di sidebar → New File → ketik `.env.local`
- **Manual:** Buka Notepad, paste isi di bawah, Save As → `.env.local` (tipe: All Files, bukan .txt)
- **Important:** Pastikan nama file **TIDAK ada** ekstensi `.txt` di belakangnya!

### 8.2 Isi File .env.local

```env
# =============================================================================
# MIMO 2.5 Kas Digital — Environment Variables
# =============================================================================

# -- Supabase (WAJIB) ---------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# -- Telegram Bot (opsional, kalau mau pakai fitur Telegram) ------------------
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_WEBHOOK_SECRET=isi-dengan-random-string-dari-langkah-6.2

# -- Google Gemini AI (opsional, untuk fitur Scan Struk) ----------------------
GEMINI_API_KEY=AIzaSy...

# -- App ----------------------------------------------------------------------
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="MIMO 2.5 Kas Digital"

# -- Gemini API (opsional) -----------------------------------------------------
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSy...
```

**Ganti** semua nilai `xxx` dengan data asli dari langkah sebelumnya.

---

## 9. Jalankan di Komputer (Local)

### 9.1 Jalankan Server Development
```bash
# Pastikan masih di folder project
cd Documents/mimo-2.5-kas-digital

# Jalankan
npm run dev
```

### 9.2 Buka di Browser
Buka browser (Chrome/Firefox), ketik:
```
http://localhost:3000
```

### 9.3 Login
1. Kamu akan diarahkan ke halaman **Login**
2. Karena belum ada user, kamu perlu membuatnya manual di Supabase:

**Buat User Pertama:**
1. Buka dashboard **Supabase**
2. Klik **Authentication** di sidebar
3. Klik tab **Users**
4. Klik **"Add user"**
5. Isi:
   - **Email:** `admin@mimo.local` (atau email kamu)
   - **Password:** `password123` (atau password apapun)
   - **Auto Confirm:** ✅ centang
6. Klik **"Create user"**

**Buat Data User di Tabel users:**
1. Klik **Table Editor** di sidebar
2. Buka tabel **users**
3. Klik **"Insert row"** atau **"New record"**
4. Isi:
   - `id`: **copy dari Authentication → Users → ID user yang tadi dibuat**
   - `full_name`: `Admin`
   - `email`: `admin@mimo.local`
   - `role`: `admin`
   - `is_active`: `true`
5. Klik **"Save"**

### 9.4 Login Sekarang
1. Kembali ke `http://localhost:3000`
2. Login pakai email & password yang tadi dibuat
3. **Berhasil!** 🎉 Dashboard harusnya sudah muncul

### 9.5 Coba Semua Fitur
- ✅ Dashboard — Lihat ringkasan (masih kosong)
- ✅ Transaksi → + Baru — Buat transaksi pertama
- ✅ Wallet — Buat wallet baru (Tunai, BCA, GoPay)
- ✅ Kategori — Lihat/Edit kategori
- ✅ Reports — Lihat laporan bulanan
- ✅ Split Bill — Coba bagi tagihan
- ✅ Scan Struk — Upload foto struk
- ✅ Settings → Budget — Buat budget per kategori
- ✅ Settings → Profile — Lihat profil

### 9.6 Stop Server
Tekan `Ctrl + C` di terminal untuk menghentikan server.

---

## 10. Buat Akun GitHub

### 10.1 Daftar
1. Buka **https://github.com**
2. Klik **"Sign up"**
3. Isi email, password, username
4. Verifikasi email

### 10.2 Install GitHub CLI (opsional)
Cara ini lebih mudah daripada pakai Git command:

```bash
# Windows (download dari https://cli.github.com)
winget install GitHub.cli

# Mac
brew install gh

# Login
gh auth login
```

Atau bisa pakai **GitHub Desktop** (lebih visual): https://desktop.github.com

---

## 11. Upload ke GitHub

### Cara Manual (via Terminal):
```bash
# Masuk ke folder project
cd Documents/mimo-2.5-kas-digital

# Inisialisasi git (kalau belum)
git init

# Tambah semua file
git add .

# Commit
git commit -m "Initial commit"

# Buat repository di GitHub (ganti username)
# Buka https://github.com/new
# Repository name: mimo-2.5-kas-digital
# Private (rekomendasi)
# Jangan centang "Add a README"
# Klik "Create repository"

# Hubungkan ke GitHub (ganti URL dari GitHub)
git remote add origin https://github.com/USERNAME/mimo-2.5-kas-digital.git

# Push
git branch -M main
git push -u origin main
```

### Cara Mudah (via GitHub Desktop):
1. Buka GitHub Desktop
2. File → Add local repository → Pilih folder project
3. Publish repository → Login GitHub → Publish

---

## 12. Deploy ke Vercel

### 12.1 Daftar Vercel
1. Buka **https://vercel.com**
2. Klik **"Sign Up"**
3. Daftar pakai **GitHub** (paling mudah)

### 12.2 Import Project
1. Klik **"Add New..."** → **"Project"**
2. Cari repository **mimo-2.5-kas-digital**
3. Klik **"Import"**

### 12.3 Setting Environment Variables
Di halaman deploy, klik **"Environment Variables"** dan isi:

| Nama | Nilai |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxxxxxxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` |
| `TELEGRAM_BOT_TOKEN` | `1234567890:ABCdef...` |
| `TELEGRAM_WEBHOOK_SECRET` | `random-string-dari-langkah-6.2` |
| `GEMINI_API_KEY` | `AIzaSy...` |
| `NEXT_PUBLIC_GEMINI_API_KEY` | `AIzaSy...` |
| `NEXT_PUBLIC_APP_URL` | `https://nama-project-mu.vercel.app` |

**⚠️ Penting:** `NEXT_PUBLIC_APP_URL` harus diisi dengan URL Vercel setelah deploy pertama!

### 12.4 Deploy
1. Klik **"Deploy"**
2. Tunggu 1-3 menit sampai selesai
3. Klik **"Visit"** untuk buka website

### 12.5 Update APP_URL
Setelah deploy pertama:
1. Buka Vercel Dashboard → project kamu → Settings → Environment Variables
2. Update `NEXT_PUBLIC_APP_URL` dengan URL yang benar
3. Klik **"Redeploy"** di tab Deployments

---

## 13. Setup User Login Pertama (di Vercel)

Setelah deploy, kamu perlu buat user login seperti langkah 9.3:

1. Buka **Supabase Dashboard**
2. Klik **Authentication** → **Users** → **"Add user"**
3. Isi email & password
4. Klik **"Table Editor"** → tabel **users** → **"Insert row"**
5. Isi data user (ID harus sama dengan yang di Authentication)

---

## 14. Test Semua Fitur

Setelah login di Vercel:

| Fitur | URL | Status |
|-------|-----|--------|
| Dashboard | `/` | ✅ |
| Transaksi | `/transactions` | ✅ |
| Transaksi Baru | `/transactions/new` | ✅ |
| Wallet | `/wallets` | ✅ |
| Kategori | `/categories` | ✅ |
| Laporan | `/reports` | ✅ |
| Split Bill | `/split-bill` | ✅ |
| Scan Struk | `/scan-receipt` | ✅ |
| Telegram | `/telegram` | ✅ |
| Backup | `/backups` | ✅ |
| Settings | `/settings` | ✅ |
| Profil | `/settings/profile` | ✅ |
| Budget | `/settings/budget` | ✅ |
| API Keys | `/settings/api-keys` | ✅ |
| Notifikasi | `/settings/notifications` | ✅ |

---

## 15. Troubleshooting (Masalah Umum)

### ❌ "500: INTERNAL_SERVER_ERROR" di Vercel
**Penyebab:** Environment variables belum di-set di Vercel.
**Solusi:** Pastikan semua variabel di langkah 12.3 sudah terisi. Deploy ulang.

### ❌ Login gagal / "Invalid login credentials"
**Penyebab:** User belum dibuat di Supabase.
**Solusi:** Ikuti langkah 13 untuk buat user.

### ❌ Halaman kosong / tidak ada data
**Penyebab:** Migration belum dijalankan.
**Solusi:** Ikuti langkah 5 untuk jalankan semua migration SQL.

### ❌ Error di Terminal saat `npm run dev`
**Penyebab:** Package belum terinstall.
**Solusi:**
```bash
rm -rf node_modules
npm install
npm run dev
```

### ❌ Wallet/Tabel tidak muncul
**Penyebab:** Migration 2 atau 3 belum dijalankan.
**Solusi:** Jalankan `00002_add_wallets.sql` dan `00003_add_budget_limits.sql` di SQL Editor Supabase.

### ❌ Scan Struk tidak bisa OCR
**Penyebab:** `GEMINI_API_KEY` belum diisi.
**Solusi:** Isi `NEXT_PUBLIC_GEMINI_API_KEY` di `.env.local` dan di Vercel. Tanpa ini, fitur tetap jalan (demo mode).

### ❌ Telegram Bot tidak merespon
**Penyebab:** Webhook belum di-set atau token salah.
**Solusi:** Pastikan `TELEGRAM_BOT_TOKEN` benar dan webhook sudah di-deploy.

---

## 🎉 SELAMAT!

Kamu sudah berhasil setup MIMO 2.5 Kas Digital dari awal sampai deploy!

### Ringkasan yang Sudah Dilakukan:
1. ✅ Install Node.js & Git
2. ✅ Clone project
3. ✅ Buat Supabase + Database
4. ✅ Jalankan Migration SQL
5. ✅ Setup Telegram Bot
6. ✅ Setup Gemini AI
7. ✅ Buat file .env.local
8. ✅ Test di komputer
9. ✅ Upload ke GitHub
10. ✅ Deploy ke Vercel
11. ✅ Buat user login
12. ✅ Test semua fitur

---

## 📌 CATATAN PENTING

### Environment Variables untuk Vercel:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
GEMINI_API_KEY
NEXT_PUBLIC_GEMINI_API_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME
```

### Migration SQL yang Harus Dijalankan:
1. `00001_initial_schema.sql`
2. `00002_add_wallets.sql`
3. `00003_add_budget_limits.sql`

### Update Setelah Deploy:
- Selalu update `NEXT_PUBLIC_APP_URL` dengan URL Vercel yang benar
- Jangan lupa **redeploy** setelah mengubah environment variables

---

*Dibuat dengan ❤️ untuk pemula. Selamat belajar!*
