# Camera Notes PWA

MVP PWA sederhana menggunakan React, Tailwind CSS, dan `react-webcam`.

## Fitur

- Input title
- Kamera tampil langsung di dalam aplikasi
- Menggunakan `react-webcam`
- Kamera belakang sebagai default
- Bisa mengambil lebih dari satu gambar
- Preview hasil foto
- Hapus gambar
- Input note
- PWA manifest + service worker sederhana

## Jalankan

```bash
npm install
npm run dev
```

Buka URL Vite yang muncul di terminal.

## Build production

```bash
npm run build
npm run preview
```

## Cara kerja kamera

Komponen kamera menggunakan `react-webcam`:

```jsx
<Webcam
  ref={webcamRef}
  audio={false}
  screenshotFormat="image/jpeg"
  videoConstraints={{ facingMode: 'environment' }}
/>
```

Saat user menekan **Ambil Foto**, aplikasi memanggil:

```js
webcamRef.current?.getScreenshot()
```

Hasil screenshot berupa data URL dan ditambahkan ke state `images`, sehingga user bisa mengambil beberapa foto dalam satu form.

## Catatan kamera

Camera API browser membutuhkan secure context. Gunakan HTTPS ketika aplikasi sudah di-deploy. `localhost` tetap bisa digunakan saat development.

## Tombol Simpan

Belum terhubung ke backend/database. Data form masih berada di state React dan dicetak ke browser console saat tombol **Simpan** ditekan.
