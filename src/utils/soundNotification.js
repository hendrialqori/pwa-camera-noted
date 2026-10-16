
// Lokasi audio di folder public
const SOUND_URL = "/message.mp3";

// Menyimpan instance audio selama halaman aktif
let notificationAudio = null;

// Menyimpan status audio sudah diaktifkan
let soundEnabled = false;

// Mengaktifkan audio melalui klik pengguna
export async function enableNotificationSound() {
  // Membuat objek audio jika belum ada
  if (!notificationAudio) {
    notificationAudio = new Audio(SOUND_URL);
    notificationAudio.preload = "auto";
    notificationAudio.volume = 1;
  }

  // Memulai audio dari awal
  notificationAudio.currentTime = 0;

  // Menguji pemutaran lewat interaksi pengguna
  await notificationAudio.play();

  // Menandai audio berhasil diaktifkan
  soundEnabled = true;

  return true;
}

// Memutar suara ketika notifikasi masuk
export async function playNotificationSound() {
  // Jangan memutar suara jika belum diaktifkan
  if (!soundEnabled || !notificationAudio) return false;

  try {
    // Mengulang dari awal
    notificationAudio.pause();
    notificationAudio.currentTime = 0;

    // Memutar suara
    await notificationAudio.play();

    return true;
  } catch (error) {
    // Browser bisa menolak autoplay
    console.warn("Notification sound blocked:", error);
    return false;
  }
}

// Mengecek status audio
export function isNotificationSoundEnabled() {
  return soundEnabled;
}
