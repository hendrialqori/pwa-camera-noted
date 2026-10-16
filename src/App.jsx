import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import {
  getExistingInstallationId,
  setupPushNotifications,
  testLocalNotification,
} from "./utils/pushNotification";
import {
  sendBroadcastNotification,
  syncInstallationId,
} from "./utils/api";
import { app } from "../firebase";
import { VAPID_KEY } from "./constant/firebase";

// Halaman sementara khusus pengujian Firebase Push Notification.
export default function App() {
  const [fidFromGetId, setFidFromGetId] = useState(""); // FID Firebase Installations
  const [registeredFid, setRegisteredFid] = useState(""); // FID hasil onRegistered
  const [status, setStatus] = useState("Belum registrasi FCM");
  const [title, setTitle] = useState("Test Broadcast Camera Notes");
  const [body, setBody] = useState("Halo, ini uji broadcast dari Express!");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const cleanupRef = useRef(null); // Menyimpan fungsi unsubscribe listener
  const registeringRef = useRef(false); // Mencegah klik registrasi ganda

  // Ambil ID dari Firebase Installations untuk dibandingkan; ini BUKAN bukti FCM terdaftar.
  useEffect(() => {

    console.log("Firebase Project:", app.options.projectId);
    console.log("Sender ID:", app.options.messagingSenderId);
    console.log("VAPID configured:", Boolean(VAPID_KEY));
    console.log("VAPID length:", VAPID_KEY?.length);

    let active = true;

    getExistingInstallationId()
      .then((id) => {
        if (active) setFidFromGetId(id);
      })
      .catch((error) => console.error("Gagal mengambil FID:", error));

    return () => {
      active = false;
      cleanupRef.current?.(); // Hentikan listener ketika halaman ditutup
      cleanupRef.current = null;
    };
  }, []);

  // Mendaftarkan PWA ke FCM; ID dari onRegistered dikirim ke Express/MySQL.
  async function handleRegister() {
    if (registeringRef.current) return;
    registeringRef.current = true;

    setIsRegistering(true);
    setStatus("Memulai registrasi FCM...");

    try {
      cleanupRef.current?.(); // Hindari listener ganda
      cleanupRef.current = null;

      const cleanup = await setupPushNotifications(
        (payload) => {
          // Foreground: tampilkan notifikasi Firebase dalam toast.
          toast.info(payload.notification?.title || "Notifikasi masuk", {
            description: payload.notification?.body || "Pesan baru diterima",
          });
        },
        (fid) => {
          // Callback dari registrasi FCM, bukan getId().
          setRegisteredFid(fid);
          setStatus("FCM terdaftar; sinkronisasi ke backend...");

          // Kirim FID terbaru ke backend. Tidak memblokir listener FCM.
          syncInstallationId(fid)
            .then(() => {
              setStatus("FCM terdaftar dan tersimpan di backend");
              toast.success("Installation ID tersimpan di backend");
            })
            .catch((error) => {
              setStatus("FCM terdaftar, tetapi sinkronisasi backend gagal");
              console.error("Sync FID gagal:", error);
              toast.error("Registrasi FCM sukses, penyimpanan backend gagal");
            });
        }
      );

      cleanupRef.current = cleanup;

      setStatus((current) =>
        current === "Memulai registrasi FCM..."
          ? "Menunggu callback onRegistered..."
          : current
      );

    } catch (error) {
      setStatus("Registrasi FCM gagal");
      console.error("Registrasi gagal:", error);
      toast.error(error.message || "Gagal registrasi FCM");
    } finally {
      registeringRef.current = false;
      setIsRegistering(false);
    }
  }

  // Tes notifikasi lokal: bukan pengiriman FCM dari Express.
  async function handleLocalTest() {
    try {
      await testLocalNotification();
      toast.success("Notifikasi lokal ditampilkan");
    } catch (error) {
      toast.error(error.message || "Test lokal gagal");
    }
  }

  // Kirim broadcast melalui API Express yang sudah ada.
  async function handleBroadcast(event) {
    event.preventDefault();
    if (isSending || !title.trim() || !body.trim()) return;
    setIsSending(true);

    try {
      const result = await sendBroadcastNotification(title.trim(), body.trim());
      console.log("Hasil broadcast:", result);
      // Jangan mengklaim semua perangkat berhasil tanpa membaca hasilnya.
      const report = result?.data || result;
      const success = report?.successCount;
      const failed = report?.failureCount;
      if (typeof success === "number") {
        toast.info(`Broadcast diproses: ${success} sukses, ${failed ?? 0} gagal`);
      } else {
        toast.success("Request broadcast telah diproses oleh backend");
      }
    } catch (error) {
      console.error("Broadcast gagal:", error.response?.data || error);
      toast.error(error.response?.data?.message || error.message || "Gagal broadcast");
    } finally {
      setIsSending(false);
    }
  }

  const inputClass = "w-full rounded-xl border border-gray-300 p-3 text-sm";
  const buttonClass = "w-full rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50";

  return (
    <>
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto w-full max-w-md space-y-5">
          <header>
            <h1 className="text-2xl font-bold text-gray-900">FCM Broadcast Tester</h1>
            <p className="mt-1 text-sm text-gray-500">Camera Notes — pengujian React + Express</p>
          </header>

          <section className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">1. Registrasi perangkat</h2>
            <p className="text-sm text-gray-600">Status: {status}</p>
            <label className="block text-sm font-medium">FID dari getId() — identitas instalasi</label>
            <textarea readOnly rows={2} value={fidFromGetId} className={inputClass} />
            <label className="block text-sm font-medium">FID dari onRegistered() — target FCM</label>
            <textarea readOnly rows={2} value={registeredFid} className={inputClass} />
            {registeredFid && fidFromGetId && (
              <p className="text-sm font-medium">
                Perbandingan ID: {registeredFid === fidFromGetId ? "SAMA" : "BERBEDA — cek konfigurasi FCM"}
              </p>
            )}
            <button type="button" onClick={handleRegister} disabled={isRegistering} className={`${buttonClass} bg-blue-600`}>
              {isRegistering ? "Mendaftarkan..." : "Register FCM + Simpan ke Backend"}
            </button>
            <button type="button" onClick={handleLocalTest} className={`${buttonClass} bg-gray-800`}>
              Test Notifikasi Lokal
            </button>
          </section>

          <form onSubmit={handleBroadcast} className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">2. Test broadcast dari Express</h2>
            <label className="block text-sm font-medium" htmlFor="notif-title">Judul notifikasi</label>
            <input id="notif-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} required className={inputClass} />
            <label className="block text-sm font-medium" htmlFor="notif-body">Pesan</label>
            <textarea id="notif-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={4} required className={inputClass} />
            <button type="submit" disabled={isSending || !title.trim() || !body.trim()} className={`${buttonClass} bg-emerald-700`}>
              {isSending ? "Mengirim..." : "Kirim Broadcast"}
            </button>
            <p className="text-xs text-gray-500">
              Backend mengambil daftar penerima dari MySQL. Berhasil diproses tidak berarti setiap perangkat sudah menerima pesan.
            </p>
          </form>
        </div>
      </main>
    </>
  );
}



// import { useEffect, useRef, useState } from "react";
// import { toast } from "sonner";
// import ImagePicker from "./components/ImagePicker";
//
// import {
//   getExistingInstallationId,
//   setupPushNotifications,
//   testLocalNotification
// } from "./utils/pushNotification";
// import { sendBroadcastNotification } from "./utils/api";
//
// export default function App() {
//   // Camera Notes state
//   const [title, setTitle] = useState("");
//   const [images, setImages] = useState([]);
//   const [note, setNote] = useState("");
//   const [isSubmitting, setIsSubmitting] = useState(false);
//
//   // Firebase Push Notification state
//   const [pushStatus, setPushStatus] = useState("Not connected");
//   const [installationId, setInstallationId] = useState("");
//   const [isConnecting, setIsConnecting] = useState(false);
//
//   const unsubscribeRef = useRef(null);
//   const connectingRef = useRef(false);
//   const mountedRef = useRef(true);
//
//   useEffect(() => {
//     mountedRef.current = true;
//
//     getInstallationId();
//
//     return () => {
//       mountedRef.current = false;
//       unsubscribeRef.current?.();
//       unsubscribeRef.current = null;
//     };
//   }, []);
//
//   const getInstallationId = async () => {
//     const installationId = await getExistingInstallationId();
//     console.log("Firebase Installation ID:", installationId);
//   }
//
//   // ENABLE FIREBASE PUSH NOTIFICATION
//   const handleEnablePush = async () => {
//     if (connectingRef.current) return;
//
//     connectingRef.current = true;
//     setIsConnecting(true);
//     setPushStatus("Connecting...");
//
//     try {
//       unsubscribeRef.current?.();
//       unsubscribeRef.current = null;
//
//       const cleanup = await setupPushNotifications(
//         // Called when receiving a foreground notification
//         (payload) => {
//           const notificationTitle =
//             payload.notification?.title || "New Notification";
//
//           const notificationBody =
//             payload.notification?.body || "Pesan baru diterima";
//
//           toast.info(notificationTitle, {
//             description: notificationBody,
//             duration: 5000
//           });
//         },
//
//         // Called after Firebase registration succeeds
//         (id) => {
//           if (!mountedRef.current) return;
//
//           setInstallationId(id);
//           setPushStatus("Connected");
//
//           toast.success("Firebase Push connected!");
//         }
//       );
//
//       if (!mountedRef.current) {
//         cleanup();
//         return;
//       }
//
//       unsubscribeRef.current = cleanup;
//
//       setPushStatus((current) =>
//         current === "Connected"
//           ? current
//           : "Waiting for registration..."
//       );
//     } catch (error) {
//       console.log(error);
//
//       console.error("Firebase Push Error:", error);
//
//       if (mountedRef.current) {
//         setPushStatus("Connection failed");
//         toast.error(error.message || "Firebase connection failed");
//       }
//     } finally {
//       connectingRef.current = false;
//
//       if (mountedRef.current) {
//         setIsConnecting(false);
//       }
//     }
//   };
//
//   // LOCAL BROWSER NOTIFICATION TEST
//   const handleTestNotification = async () => {
//     try {
//       await testLocalNotification();
//
//       toast.success("Local notification sent!");
//     } catch (error) {
//       console.error("Notification Test Error:", error);
//
//       toast.error(
//         error.message || "Failed to send local notification"
//       );
//     }
//   };
//
//   // COPY FIREBASE INSTALLATION ID
//   const handleCopyInstallationId = async () => {
//     try {
//       await navigator.clipboard.writeText(installationId);
//
//       toast.success("Installation ID copied!");
//     } catch (error) {
//       console.error("Copy Error:", error);
//       toast.error("Failed to copy Installation ID");
//     }
//   };
//
//   const handleBroadcastNotification = async () => {
//     const reqBoradcast = async () => {
//       const title = "Broadcast Notification";
//       const body = "This is a broadcast notification from Camera Notes.";
//
//       await sendBroadcastNotification(title, body);
//     }
//
//     toast.promise(reqBoradcast(), {
//       loading: "Sending broadcast notification...",
//       success: "Broadcast notification sent!",
//       error: "Failed to send broadcast notification"
//     });
//   }
//
//     // SAVE CAMERA NOTE
//     const handleSubmit = async (event) => {
//       event.preventDefault();
//
//       if (isSubmitting) return;
//
//       if (!title.trim()) {
//         toast.error("Title wajib diisi");
//         return;
//       }
//
//       if (images.length === 0) {
//         toast.error("Minimal ambil 1 gambar");
//         return;
//       }
//
//       setIsSubmitting(true);
//
//       const currentData = {
//         title: title.trim(),
//         images,
//         note
//       };
//
//       const saveDataPromise = new Promise((resolve) => {
//         setTimeout(() => {
//           resolve(currentData);
//         }, 2000);
//       });
//
//       try {
//         toast.promise(saveDataPromise, {
//           loading: "Menyimpan data...",
//           success: (data) =>
//             `${data.title} berhasil disimpan`,
//           error: "Data gagal disimpan"
//         });
//
//         await saveDataPromise;
//
//         setTitle("");
//         setImages([]);
//         setNote("");
//       } catch (error) {
//         console.error("Submit error:", error);
//         toast.error("Data gagal disimpan");
//       } finally {
//         setIsSubmitting(false);
//       }
//     };
//
//     return (
//       <>
//         <main className="min-h-screen bg-gray-50 px-4 py-6">
//           <div className="mx-auto w-full max-w-md">
//
//             {/* HEADER */}
//             <div className="mb-6">
//               <h1 className="text-2xl font-bold text-gray-900">
//                 Camera Notes
//               </h1>
//
//               <p className="mt-1 text-sm text-gray-500">
//                 Ambil gambar dan tambahkan catatan.
//               </p>
//             </div>
//
//
//             {/* PUSH NOTIFICATION PANEL */}
//             <section className="mb-6 space-y-4 rounded-2xl bg-white p-5 shadow-sm">
//
//               <div>
//                 <h2 className="text-lg font-bold text-gray-900">
//                   Push Notifications
//                 </h2>
//
//                 <p className="mt-1 text-sm text-gray-500">
//                   Firebase Cloud Messaging
//                 </p>
//               </div>
//
//               {/* CONNECTION STATUS */}
//               <div className="flex items-center justify-between rounded-xl bg-gray-100 p-3">
//                 <span className="text-sm font-medium text-gray-600">
//                   Firebase Status
//                 </span>
//
//                 <span
//                   className={`text-sm font-semibold ${pushStatus === "Connected"
//                     ? "text-green-600"
//                     : pushStatus === "Connection failed"
//                       ? "text-red-600"
//                       : "text-gray-600"
//                     }`}
//                 >
//                   {pushStatus}
//                 </span>
//               </div>
//
//               {/* ENABLE FIREBASE PUSH */}
//               <button
//                 type="button"
//                 onClick={handleEnablePush}
//                 disabled={isConnecting}
//                 className="
//                 w-full
//                 rounded-xl
//                 bg-blue-600
//                 px-4
//                 py-3
//                 text-sm
//                 font-semibold
//                 text-white
//                 transition
//                 active:scale-[0.99]
//                 disabled:cursor-not-allowed
//                 disabled:opacity-50
//               "
//               >
//                 {isConnecting
//                   ? "Connecting..."
//                   : "Enable Firebase Push"}
//               </button>
//
//               {/* TEST LOCAL NOTIFICATION */}
//               <button
//                 type="button"
//                 onClick={handleTestNotification}
//                 className="
//                 w-full
//                 rounded-xl
//                 bg-gray-900
//                 px-4
//                 py-3
//                 text-sm
//                 font-semibold
//                 text-white
//                 transition
//                 active:scale-[0.99]
//               "
//               >
//                 Test Local Notification
//               </button>
//
//               {/* FIREBASE INSTALLATION ID */}
//               {installationId && (
//                 <div className="space-y-2">
//                   <label className="block text-sm font-medium text-gray-700">
//                     Firebase Installation ID
//                   </label>
//
//                   <textarea
//                     readOnly
//                     value={installationId}
//                     rows={3}
//                     className="
//                     w-full
//                     resize-none
//                     rounded-xl
//                     border
//                     border-gray-300
//                     bg-gray-50
//                     p-3
//                     text-xs
//                     text-gray-700
//                   "
//                   />
//
//                   <button
//                     type="button"
//                     onClick={handleCopyInstallationId}
//                     className="
//                     w-full
//                     rounded-xl
//                     border
//                     border-blue-600
//                     px-4
//                     py-3
//                     text-sm
//                     font-semibold
//                     text-blue-600
//                     transition
//                     active:scale-[0.99]
//                   "
//                   >
//                     Copy Installation ID
//                   </button>
//                 </div>
//               )}
//
//               <p className="text-xs leading-relaxed text-gray-400">
//                 Local Test verifies browser notification
//                 permission. Firebase Push enables remote
//                 notifications from Firebase Cloud Messaging.
//               </p>
//             </section>
//
//             <section className="mb-6 space-y-4 rounded-2xl bg-white p-5 shadow-sm">
//
//               <div>
//                 <h2 className="text-lg font-bold text-gray-900">
//                   Broadcast Notifications
//                 </h2>
//               </div>
//
//               {/* TEST LOCAL NOTIFICATION */}
//               <button
//                 type="button"
//                 onClick={handleBroadcastNotification}
//                 className="
//                 w-full
//                 rounded-xl
//                 bg-gray-900
//                 px-4
//                 py-3
//                 text-sm
//                 font-semibold
//                 text-white
//                 transition
//                 active:scale-[0.99]
//               "
//               >
//                 Test Broadcast Notification
//               </button>
//
//               {/* FIREBASE INSTALLATION ID */}
//               {installationId && (
//                 <div className="space-y-2">
//                   <label className="block text-sm font-medium text-gray-700">
//                     Firebase Installation ID
//                   </label>
//
//                   <textarea
//                     readOnly
//                     value={installationId}
//                     rows={3}
//                     className="
//                     w-full
//                     resize-none
//                     rounded-xl
//                     border
//                     border-gray-300
//                     bg-gray-50
//                     p-3
//                     text-xs
//                     text-gray-700
//                   "
//                   />
//
//                   <button
//                     type="button"
//                     onClick={handleCopyInstallationId}
//                     className="
//                     w-full
//                     rounded-xl
//                     border
//                     border-blue-600
//                     px-4
//                     py-3
//                     text-sm
//                     font-semibold
//                     text-blue-600
//                     transition
//                     active:scale-[0.99]
//                   "
//                   >
//                     Copy Installation ID
//                   </button>
//                 </div>
//               )}
//             </section>
//
//             {/* CAMERA NOTES FORM */}
//             <form
//               onSubmit={handleSubmit}
//               className="space-y-5 rounded-2xl bg-white p-5 shadow-sm"
//             >
//
//               {/* TITLE */}
//               <div>
//                 <label
//                   htmlFor="title"
//                   className="mb-2 block text-sm font-medium text-gray-700"
//                 >
//                   Title
//                 </label>
//
//                 <input
//                   id="title"
//                   type="text"
//                   value={title}
//                   onChange={(event) => {
//                     setTitle(event.target.value);
//                   }}
//                   placeholder="Masukkan title"
//                   disabled={isSubmitting}
//                   className="
//                   w-full
//                   rounded-xl
//                   border
//                   border-gray-300
//                   px-4
//                   py-3
//                   text-sm
//                   text-gray-900
//                   outline-none
//                   transition
//                   placeholder:text-gray-400
//                   focus:border-gray-500
//                   disabled:cursor-not-allowed
//                   disabled:bg-gray-100
//                 "
//                 />
//               </div>
//
//               {/* IMAGE */}
//               <ImagePicker
//                 images={images}
//                 onChange={setImages}
//               />
//
//               {/* NOTE */}
//               <div>
//                 <label
//                   htmlFor="note"
//                   className="mb-2 block text-sm font-medium text-gray-700"
//                 >
//                   Note
//                 </label>
//
//                 <textarea
//                   id="note"
//                   value={note}
//                   onChange={(event) => {
//                     setNote(event.target.value);
//                   }}
//                   placeholder="Tambahkan catatan..."
//                   rows={5}
//                   disabled={isSubmitting}
//                   className="
//                   w-full
//                   resize-none
//                   rounded-xl
//                   border
//                   border-gray-300
//                   px-4
//                   py-3
//                   text-sm
//                   text-gray-900
//                   outline-none
//                   transition
//                   placeholder:text-gray-400
//                   focus:border-gray-500
//                   disabled:cursor-not-allowed
//                   disabled:bg-gray-100
//                 "
//                 />
//               </div>
//
//               {/* SUBMIT */}
//               <button
//                 type="submit"
//                 disabled={isSubmitting}
//                 className="
//                 w-full
//                 rounded-xl
//                 bg-gray-900
//                 px-4
//                 py-3
//                 text-sm
//                 font-semibold
//                 text-white
//                 transition
//                 active:scale-[0.99]
//                 disabled:cursor-not-allowed
//                 disabled:bg-gray-400
//                 disabled:active:scale-100
//               "
//               >
//                 {isSubmitting ? "Menyimpan..." : "Simpan"}
//               </button>
//             </form>
//
//           </div>
//         </main>
//       </>
//     );
//   }
