# LambungCare Enhanced

Aplikasi React Native JavaScript dengan Expo SDK 54.

## Menjalankan di Android

1. Extract ZIP dan buka folder proyek di VS Code.
2. Pastikan Node.js, Android Studio, Android SDK, dan emulator sudah siap.
3. Jalankan `npm install`.
4. Jalankan `npm run android`.

Jika Metro pernah menyimpan cache lama, hentikan server lalu jalankan `npx expo start --clear`.

## Fitur
- Login demo lokal menggunakan email berformat valid dan password tidak kosong.
- Sesi login tersimpan lokal.
- Catatan makanan, minuman, keluhan, tingkat gejala, dugaan pemicu, dan catatan tambahan.
- Analisis ringkasan makanan dan gejala berdasarkan catatan pengguna.
- Panduan kebiasaan dan riwayat.
- Penyimpanan catatan lokal dipisahkan berdasarkan email.

## Catatan penting
Login ini hanya simulasi lokal: email dan password tidak diverifikasi ke server dan password tidak disimpan. Jangan gunakan password asli/rahasia. Ini bukan sistem autentikasi aman untuk aplikasi produksi.
Analisis hanya merangkum laporan pengguna, bukan diagnosis medis atau bukti sebab-akibat. Jadwal makan saat ini dapat diedit, tetapi belum mengirim notifikasi otomatis.
