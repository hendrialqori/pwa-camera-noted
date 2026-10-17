
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  checkPushSubscription,
  getExistingInstallationId,
  setupPushNotifications,
  testLocalNotification,
} from "./utils/pushNotification";

import {
  sendBroadcastNotification,
  syncInstallationId,
} from "./utils/api";
import { CAMERA_NOTES_INSTALLATION_ID } from "./constant/localStorage";

// Lokasi file suara di folder public
const SOUND_URL = "/message.mp3";

export default function App() {
  // State Firebase
  const [fidFromGetId, setFidFromGetId] = useState("");
  const [registeredFid, setRegisteredFid] = useState("");
  const [status, setStatus] = useState("Belum registrasi FCM");

  // State Broadcast
  const [title, setTitle] = useState("Test Broadcast Camera Notes");
  const [body, setBody] = useState("Halo, ini test push notification!");

  // State Loading
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // State Sound
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  // Referensi listener Firebase
  const cleanupRef = useRef(null);

  // Mencegah registrasi bersamaan
  const registeringRef = useRef(false);
  const alreadyRegisteredRef = useRef(false);

  // Referensi audio
  const audioRef = useRef(null);
  const soundEnabledRef = useRef(false);

  // Mengambil Firebase Installation ID saat aplikasi dibuka
  useEffect(() => {
    let active = true;

    // Menyiapkan file suara
    const audio = new Audio(SOUND_URL);
    audio.preload = "auto";
    audio.volume = 1;

    audioRef.current = audio;

    // Mengambil ID Firebase Installations
    getExistingInstallationId()
      .then((id) => {
        if (active) setFidFromGetId(id);
      })
      .catch((error) => {
        console.error("Gagal mengambil FID:", error);
      });

    // Membersihkan listener ketika aplikasi ditutup
    return () => {
      active = false;

      cleanupRef.current?.();
      cleanupRef.current = null;

      audio.pause();
      audioRef.current = null;
      soundEnabledRef.current = false;
    };
  }, []);

  // Memutar suara notifikasi
  const playNotificationSound = async () => {
    // Periksa apakah suara sudah diaktifkan
    if (!soundEnabledRef.current || !audioRef.current) {
      return false;
    }

    try {
      // Memulai audio dari awal
      audioRef.current.pause();
      audioRef.current.currentTime = 0;

      // Memutar audio
      await audioRef.current.play();

      return true;
    } catch (error) {
      console.warn("Sound gagal diputar:", error);
      return false;
    }
  };

  // Mengaktifkan suara notifikasi
  const handleEnableSound = async () => {
    try {
      // Memastikan objek audio tersedia
      if (!audioRef.current) {
        throw new Error("Audio belum tersedia");
      }

      // Memutar audio lewat interaksi pengguna
      audioRef.current.currentTime = 0;
      await audioRef.current.play();

      // Mengaktifkan suara untuk sesi ini
      soundEnabledRef.current = true;
      setSoundEnabled(true);

      toast.success("Suara notifikasi aktif");
    } catch (error) {
      console.error("Enable Sound Error:", error);
      toast.error("Gagal mengaktifkan suara");
    }
  };

  // Menguji suara secara manual
  const handleTestSound = async () => {
    const success = await playNotificationSound();

    if (success) {
      toast.success("Suara berhasil diputar");
    } else {
      toast.error("Suara belum aktif atau diblokir browser");
    }
  };

  // Mendaftarkan perangkat ke Firebase Cloud Messaging
  const handleRegister = async () => {
    // Mencegah registrasi ganda
    if (registeringRef.current) return;

    registeringRef.current = true;
    setIsRegistering(true);
    setStatus("Memulai registrasi FCM...");

    try {
      // Membersihkan listener sebelumnya
      cleanupRef.current?.();
      cleanupRef.current = null;

      // Registrasi Firebase Push Notification
      const cleanup = await setupPushNotifications(
        // Callback ketika notifikasi masuk
        (payload) => {
          console.log("FCM Notification:", payload);

          // Mengambil judul notifikasi
          const notifTitle =
            payload.notification?.title ||
            "Notifikasi Baru";

          // Mengambil isi notifikasi
          const notifBody =
            payload.notification?.body ||
            "Pesan baru diterima";

          // Menampilkan toast
          toast.info(notifTitle, {
            description: notifBody,
            duration: 5000,
          });

          // Memutar suara ketika FCM diterima
          playNotificationSound();
        },

        // Callback saat Firebase berhasil registrasi
        (fid) => {
          console.log("FCM Registered ID:", fid);

          // Memperbarui ID dari Firebase
          setRegisteredFid(fid);
          // Memperbarui status
          setStatus("FCM terdaftar, menyimpan ke backend...");

          if (alreadyRegisteredRef.current) {
            setStatus("FCM Connected - Backend Synced");
            return
          }

          // Menyimpan Installation ID ke Express
          syncInstallationId(fid)
            .then(() => {
              setStatus("FCM Connected - Backend Synced");

              toast.success(
                "Installation ID berhasil disimpan"
              );
            })
            .catch((error) => {
              console.error(
                "Sync Error:",
                error.response?.data || error
              );

              setStatus("FCM Connected - Backend Sync Failed");

              toast.error(
                error.response?.data?.message ||
                "Gagal menyimpan Installation ID"
              );
            })
            .finally(() => {
              alreadyRegisteredRef.current = true;
            })
        }
      );

      // Menyimpan fungsi cleanup
      cleanupRef.current = cleanup;

      // Menunggu callback registrasi apabila belum diterima
      setStatus((current) =>
        current === "Memulai registrasi FCM..."
          ? "Menunggu callback Firebase..."
          : current
      );
    } catch (error) {
      console.error("Firebase Registration Error:", error);

      setStatus("Registrasi FCM gagal");

      toast.error(
        error.message || "Gagal melakukan registrasi"
      );
    } finally {
      registeringRef.current = false;
      setIsRegistering(false);
    }
  };

  // Menguji notifikasi lokal
  const handleLocalTest = async () => {
    try {
      // Menampilkan notifikasi melalui Service Worker
      await testLocalNotification();

      toast.success("Local notification berhasil");
    } catch (error) {
      console.error("Local Notification Error:", error);
      toast.error(error.message);
    }
  };

  // Mengirim broadcast melalui Express
  const handleBroadcast = async (event) => {
    event.preventDefault();

    // Validasi sebelum mengirim
    if (isSending || !title.trim() || !body.trim()) return;

    setIsSending(true);

    try {
      // Mengirim request ke backend Express
      const result = await sendBroadcastNotification(
        title.trim(),
        body.trim()
      );

      console.log("Broadcast Result:", result);

      // Mengambil laporan dari backend
      const report = result?.data || result;
      // Mengambil jumlah pengiriman berhasil
      const success = report?.successCount;
      // Mengambil jumlah pengiriman gagal
      const failed = report?.failureCount;

      // Menampilkan hasil pengiriman
      if (typeof success === "number") {
        toast.info(
          `Broadcast diproses: ${success} sukses, ${failed ?? 0} gagal`
        );
      } else {
        toast.success("Request broadcast diproses backend");
      }
    } catch (error) {
      console.error(
        "Broadcast Error:",
        error.response?.data || error
      );

      toast.error(
        error.response?.data?.message ||
        error.message ||
        "Gagal mengirim broadcast"
      );
    } finally {
      setIsSending(false);
    }
  };

const handleDebugFCM = async () => {
  try {
    // Periksa mode dan origin aplikasi
    const info = {
      origin: window.location.origin,
      standalone: window.matchMedia(
        "(display-mode: standalone)"
      ).matches,
      permission: Notification.permission,
      controller:
        navigator.serviceWorker.controller?.scriptURL ?? null,
      workers: [],
    };

    // Ambil seluruh registrasi Service Worker
    const registrations =
      await navigator.serviceWorker.getRegistrations();

    for (const sw of registrations) {
      // Periksa subscription setiap registrasi
      const subscription =
        await sw.pushManager.getSubscription();

      info.workers.push({
        script: sw.active?.scriptURL ?? null,
        scope: sw.scope,
        subscribed: Boolean(subscription),
        endpointOrigin: subscription
          ? new URL(subscription.endpoint).origin
          : null,
      });
    }

    // Tampilkan hasil pada halaman
    setDebugInfo(info);

    console.log("[FCM DIAGNOSTIC]", info);
  } catch (error) {
    console.error("[FCM DIAGNOSTIC ERROR]", error);

    setDebugInfo({
      error: error.message,
    });
  }
};


  // Class CSS reusable
  const inputClass =
    "w-full rounded-xl border border-gray-300 p-3 text-sm";

  const buttonClass =
    "w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50";

  return (
    <>
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto w-full max-w-md space-y-5">

          {/* HEADER */}
          <header>
            <h1 className="text-2xl font-bold text-gray-900">
              FCM Broadcast Tester
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Camera Notes — Firebase + Express
            </p>
          </header>

          {/* FIREBASE REGISTRATION */}
          <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">

            <h2 className="text-lg font-bold">
              1. Firebase Registration
            </h2>

            <p className="text-sm text-gray-600">
              Status: {status}
            </p>

            {/* Firebase Installations ID */}
            <label className="block text-sm font-medium">
              Firebase Installation ID
            </label>

            <textarea
              readOnly
              rows={2}
              value={fidFromGetId}
              className={inputClass}
            />

            {/* Registered FCM ID */}
            <label className="block text-sm font-medium">
              FCM Registered ID
            </label>

            <textarea
              readOnly
              rows={2}
              value={registeredFid}
              className={inputClass}
            />

            {/* Compare ID */}
            {registeredFid && fidFromGetId && (
              <p className="text-sm font-medium">
                ID Comparison:{" "}
                {registeredFid === fidFromGetId
                  ? "SAMA"
                  : "BERBEDA"}
              </p>
            )}

            {/* Register Button */}
            <button
              type="button"
              onClick={handleRegister}
              disabled={isRegistering}
              className={`${buttonClass} bg-blue-600`}
            >
              {isRegistering
                ? "Mendaftarkan..."
                : "Register FCM + Sync Backend"}
            </button>

            {/* Local Test */}
            <button
              type="button"
              onClick={handleLocalTest}
              className={`${buttonClass} bg-gray-800`}
            >
              Test Local Notification
            </button>
            <button
              type="button"
              onClick={checkPushSubscription}
              className={`${buttonClass} bg-green-800`}
            >
              Check Push Subscription
            </button>
          </section>

          {/* SOUND NOTIFICATION */}
          <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">

            <h2 className="text-lg font-bold">
              2. Notification Sound
            </h2>

            {/* Sound Status */}
            <p className="text-sm text-gray-600">
              Sound Status:{" "}
              <span
                className={
                  soundEnabled
                    ? "font-semibold text-green-600"
                    : "font-semibold text-red-600"
                }
              >
                {soundEnabled ? "Enabled" : "Disabled"}
              </span>
            </p>

            {/* Enable Sound */}
            <button
              type="button"
              onClick={handleEnableSound}
              disabled={soundEnabled}
              className={`${buttonClass} bg-blue-600`}
            >
              {soundEnabled
                ? "Sound Enabled"
                : "Enable Notification Sound"}
            </button>

            {/* Test Sound */}
            <button
              type="button"
              onClick={handleTestSound}
              className={`${buttonClass} bg-gray-900`}
            >
              Test Sound
            </button>

            <p className="text-xs text-gray-500">
              Suara custom diputar saat FCM diterima
              ketika PWA sedang terbuka.
            </p>
          </section>

          {/* BROADCAST NOTIFICATION */}
          <form
            onSubmit={handleBroadcast}
            className="space-y-3 rounded-2xl bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold">
              3. Test Broadcast Notification
            </h2>

            {/* Notification Title */}
            <label
              htmlFor="notif-title"
              className="block text-sm font-medium"
            >
              Notification Title
            </label>

            <input
              id="notif-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              className={inputClass}
            />

            {/* Notification Message */}
            <label
              htmlFor="notif-body"
              className="block text-sm font-medium"
            >
              Message
            </label>

            <textarea
              id="notif-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={1000}
              rows={4}
              required
              className={inputClass}
            />

            {/* Send Broadcast */}
            <button
              type="submit"
              disabled={
                isSending ||
                !title.trim() ||
                !body.trim()
              }
              className={`${buttonClass} bg-emerald-700`}
            >
              {isSending
                ? "Sending..."
                : "Send Broadcast"}
            </button>

            <p className="text-xs text-gray-500">
              Backend Express mengambil seluruh Installation ID
              dari database MySQL untuk broadcast.
            </p>
          </form>


          <section className="space-y-3 rounded-2xl bg-white p-5">
            <h2 className="text-lg font-bold">
              FCM Diagnostic
            </h2>

            <button
              type="button"
              onClick={handleDebugFCM}
              className="w-full rounded-xl bg-purple-600 p-3 text-white"
            >
              Check FCM Subscription
            </button>

            {debugInfo && (
              <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl bg-gray-100 p-3 text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            )}
          </section>


        </div>
      </main>
    </>
  );
}
