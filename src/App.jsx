
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
import { getDeviceInfo } from "./utils/deviceInfo";
import Button from "./components/Button";

import { BellRing } from 'lucide-react';

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
        async (fid) => {
          console.log("FCM Registered ID:", fid);

          // Memperbarui ID dari Firebase
          setRegisteredFid(fid);
          // Memperbarui status
          setStatus("FCM terdaftar, menyimpan ke backend...");

          // if (alreadyRegisteredRef.current) {
          //   setStatus("FCM Connected - Backend Synced");
          //   return
          // }

          // const deviceInfo = getDeviceInfo();
          // console.log(deviceInfo);

          // Menyimpan Installation ID ke Express

          try {
            await syncInstallationId({
              installationId: fid,
              deviceInfo: "TEST 123"
            })

            toast.success(
              "Installation ID berhasil disimpan"
            );

          } catch (error) {
            if (error.response?.data.statusCode === 409) return
            toast.error(error.response.data.message || 'Gagal menyimpan Installation ID')
          }
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

      toast.warning(
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
      // Deteksi apakah aplikasi berjalan sebagai PWA
      const standalone = window.matchMedia(
        "(display-mode: standalone)"
      ).matches;

      // Ambil seluruh registrasi Service Worker
      const registrations =
        await navigator.serviceWorker.getRegistrations();

      // Informasi lingkungan aplikasi
      const info = {
        timestamp: new Date().toISOString(),

        // Identitas halaman
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,

        // Browser atau PWA terinstal
        standalone,
        displayMode: standalone ? "standalone" : "browser",

        // Informasi browser dan perangkat
        userAgent: navigator.userAgent,
        platform: navigator.platform,

        // Status keamanan dan koneksi
        secureContext: window.isSecureContext,
        online: navigator.onLine,

        // Dukungan Push Notification
        notificationSupported: "Notification" in window,
        pushSupported: "PushManager" in window,
        serviceWorkerSupported: "serviceWorker" in navigator,

        // Permission notifikasi
        permission:
          "Notification" in window
            ? Notification.permission
            : "unsupported",

        // Service Worker yang mengontrol halaman
        controller:
          navigator.serviceWorker.controller?.scriptURL ?? null,

        // Jumlah Service Worker terdaftar
        totalWorkers: registrations.length,

        workers: [],

        // Status khusus Firebase
        fcm: {
          workerFound: false,
          workerActive: false,
          subscribed: false,
          scope: null,
          endpointOrigin: null,
        },
      };

      // Periksa setiap Service Worker
      for (const registration of registrations) {
        let subscription = null;
        let subscriptionError = null;

        try {
          // Ambil Push Subscription milik worker
          subscription =
            await registration.pushManager.getSubscription();
        } catch (error) {
          subscriptionError = error.message;
        }

        const workerInfo = {
          script: registration.active?.scriptURL ?? null,
          scope: registration.scope,

          // Lifecycle Service Worker
          activeState: registration.active?.state ?? null,
          installing: Boolean(registration.installing),
          waiting: Boolean(registration.waiting),

          // Status Push Subscription
          subscribed: Boolean(subscription),

          endpointOrigin: subscription
            ? new URL(subscription.endpoint).origin
            : null,

          // Metadata subscription
          expirationTime:
            subscription?.expirationTime ?? null,

          // Error pemeriksaan jika ada
          subscriptionError,
        };

        info.workers.push(workerInfo);

        // Identifikasi worker khusus Firebase
        const isFCMWorker =
          registration.scope.endsWith(
            "/firebase-cloud-messaging-push-scope/"
          ) ||
          registration.active?.scriptURL.includes(
            "firebase-messaging-sw.js"
          );

        if (isFCMWorker) {
          info.fcm = {
            workerFound: true,
            workerActive:
              registration.active?.state === "activated",
            subscribed: Boolean(subscription),
            scope: registration.scope,
            endpointOrigin: subscription
              ? new URL(subscription.endpoint).origin
              : null,
            subscriptionError,
          };
        }
      }

      // Kesimpulan diagnostik
      if (!info.fcm.workerFound) {
        info.diagnosis =
          "FCM Service Worker tidak ditemukan";
      } else if (!info.fcm.workerActive) {
        info.diagnosis =
          "FCM Service Worker belum aktif";
      } else if (info.fcm.subscriptionError) {
        info.diagnosis =
          "Gagal membaca Push Subscription";
      } else if (!info.fcm.subscribed) {
        info.diagnosis =
          "FCM Service Worker aktif, tetapi Push Subscription tidak tersedia";
      } else {
        info.diagnosis =
          "FCM Push Subscription aktif";
      }

      // Tampilkan hasil pada React
      setDebugInfo(info);

      // Log untuk browser DevTools
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
          <header className="flex justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                FCM Broadcast Tester
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Camera Notes — Firebase + Express
              </p>
            </div>
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
