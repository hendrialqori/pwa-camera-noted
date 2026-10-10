
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ImagePicker from "./components/ImagePicker";

import {
  setupPushNotifications,
  testLocalNotification
} from "./utils/pushNotification";

export default function App() {
  // Camera Notes state
  const [title, setTitle] = useState("");
  const [images, setImages] = useState([]);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Firebase Push Notification state
  const [pushStatus, setPushStatus] = useState("Not connected");
  const [installationId, setInstallationId] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const unsubscribeRef = useRef(null);
  const connectingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, []);

  // ENABLE FIREBASE PUSH NOTIFICATION
  const handleEnablePush = async () => {
    if (connectingRef.current) return;

    connectingRef.current = true;
    setIsConnecting(true);
    setPushStatus("Connecting...");

    try {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;

      const cleanup = await setupPushNotifications(
        // Called when receiving a foreground notification
        (payload) => {
          const notificationTitle =
            payload.notification?.title || "New Notification";

          const notificationBody =
            payload.notification?.body || "Pesan baru diterima";

          toast.info(notificationTitle, {
            description: notificationBody,
            duration: 5000
          });
        },

        // Called after Firebase registration succeeds
        (id) => {
          if (!mountedRef.current) return;

          setInstallationId(id);
          setPushStatus("Connected");

          toast.success("Firebase Push connected!");
        }
      );

      if (!mountedRef.current) {
        cleanup();
        return;
      }

      unsubscribeRef.current = cleanup;

      setPushStatus((current) =>
        current === "Connected"
          ? current
          : "Waiting for registration..."
      );
    } catch (error) {
      console.log(error);
      
      console.error("Firebase Push Error:", error);

      if (mountedRef.current) {
        setPushStatus("Connection failed");
        toast.error(error.message || "Firebase connection failed");
      }
    } finally {
      connectingRef.current = false;

      if (mountedRef.current) {
        setIsConnecting(false);
      }
    }
  };

  // LOCAL BROWSER NOTIFICATION TEST
  const handleTestNotification = async () => {
    try {
      await testLocalNotification();

      toast.success("Local notification sent!");
    } catch (error) {
      console.error("Notification Test Error:", error);

      toast.error(
        error.message || "Failed to send local notification"
      );
    }
  };

  // COPY FIREBASE INSTALLATION ID
  const handleCopyInstallationId = async () => {
    try {
      await navigator.clipboard.writeText(installationId);

      toast.success("Installation ID copied!");
    } catch (error) {
      console.error("Copy Error:", error);
      toast.error("Failed to copy Installation ID");
    }
  };

  // SAVE CAMERA NOTE
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!title.trim()) {
      toast.error("Title wajib diisi");
      return;
    }

    if (images.length === 0) {
      toast.error("Minimal ambil 1 gambar");
      return;
    }

    setIsSubmitting(true);

    const currentData = {
      title: title.trim(),
      images,
      note
    };

    const saveDataPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve(currentData);
      }, 2000);
    });

    try {
      toast.promise(saveDataPromise, {
        loading: "Menyimpan data...",
        success: (data) =>
          `${data.title} berhasil disimpan`,
        error: "Data gagal disimpan"
      });

      await saveDataPromise;

      setTitle("");
      setImages([]);
      setNote("");
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Data gagal disimpan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <main className="min-h-screen bg-gray-50 px-4 py-6">
        <div className="mx-auto w-full max-w-md">

          {/* HEADER */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Camera Notes
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Ambil gambar dan tambahkan catatan.
            </p>
          </div>

          {/* PUSH NOTIFICATION PANEL */}
          <section className="mb-6 space-y-4 rounded-2xl bg-white p-5 shadow-sm">

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Push Notifications
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Firebase Cloud Messaging
              </p>
            </div>

            {/* CONNECTION STATUS */}
            <div className="flex items-center justify-between rounded-xl bg-gray-100 p-3">
              <span className="text-sm font-medium text-gray-600">
                Firebase Status
              </span>

              <span
                className={`text-sm font-semibold ${
                  pushStatus === "Connected"
                    ? "text-green-600"
                    : pushStatus === "Connection failed"
                    ? "text-red-600"
                    : "text-gray-600"
                }`}
              >
                {pushStatus}
              </span>
            </div>

            {/* ENABLE FIREBASE PUSH */}
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={isConnecting}
              className="
                w-full
                rounded-xl
                bg-blue-600
                px-4
                py-3
                text-sm
                font-semibold
                text-white
                transition
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {isConnecting
                ? "Connecting..."
                : "Enable Firebase Push"}
            </button>

            {/* TEST LOCAL NOTIFICATION */}
            <button
              type="button"
              onClick={handleTestNotification}
              className="
                w-full
                rounded-xl
                bg-gray-900
                px-4
                py-3
                text-sm
                font-semibold
                text-white
                transition
                active:scale-[0.99]
              "
            >
              Test Local Notification
            </button>

            {/* FIREBASE INSTALLATION ID */}
            {installationId && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Firebase Installation ID
                </label>

                <textarea
                  readOnly
                  value={installationId}
                  rows={3}
                  className="
                    w-full
                    resize-none
                    rounded-xl
                    border
                    border-gray-300
                    bg-gray-50
                    p-3
                    text-xs
                    text-gray-700
                  "
                />

                <button
                  type="button"
                  onClick={handleCopyInstallationId}
                  className="
                    w-full
                    rounded-xl
                    border
                    border-blue-600
                    px-4
                    py-3
                    text-sm
                    font-semibold
                    text-blue-600
                    transition
                    active:scale-[0.99]
                  "
                >
                  Copy Installation ID
                </button>
              </div>
            )}

            <p className="text-xs leading-relaxed text-gray-400">
              Local Test verifies browser notification
              permission. Firebase Push enables remote
              notifications from Firebase Cloud Messaging.
            </p>
          </section>

          {/* CAMERA NOTES FORM */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl bg-white p-5 shadow-sm"
          >

            {/* TITLE */}
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Title
              </label>

              <input
                id="title"
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                }}
                placeholder="Masukkan title"
                disabled={isSubmitting}
                className="
                  w-full
                  rounded-xl
                  border
                  border-gray-300
                  px-4
                  py-3
                  text-sm
                  text-gray-900
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-gray-500
                  disabled:cursor-not-allowed
                  disabled:bg-gray-100
                "
              />
            </div>

            {/* IMAGE */}
            <ImagePicker
              images={images}
              onChange={setImages}
            />

            {/* NOTE */}
            <div>
              <label
                htmlFor="note"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Note
              </label>

              <textarea
                id="note"
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                }}
                placeholder="Tambahkan catatan..."
                rows={5}
                disabled={isSubmitting}
                className="
                  w-full
                  resize-none
                  rounded-xl
                  border
                  border-gray-300
                  px-4
                  py-3
                  text-sm
                  text-gray-900
                  outline-none
                  transition
                  placeholder:text-gray-400
                  focus:border-gray-500
                  disabled:cursor-not-allowed
                  disabled:bg-gray-100
                "
              />
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                w-full
                rounded-xl
                bg-gray-900
                px-4
                py-3
                text-sm
                font-semibold
                text-white
                transition
                active:scale-[0.99]
                disabled:cursor-not-allowed
                disabled:bg-gray-400
                disabled:active:scale-100
              "
            >
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </button>
          </form>

        </div>
      </main>
    </>
  );
}
