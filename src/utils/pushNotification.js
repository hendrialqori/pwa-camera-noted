
import {
  getMessaging,
  isSupported,
  onMessage,
  onRegistered,
  register,
} from "firebase/messaging";
import { getInstallations, getId } from "firebase/installations";

import { app } from "../../firebase";
import { VAPID_KEY } from "../constant/firebase";
import { CAMERA_NOTES_INSTALLATION_ID } from "../constant/localStorage";

export async function setupPushNotifications(
  onNotification,
  onRegistration
) {
  if (!("Notification" in window)) {
    throw new Error("Browser notifications unsupported");
  }

  if (!(await isSupported())) {
    throw new Error("Firebase Messaging unsupported");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission denied");
  }

  const sw = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
    {
      scope: "/firebase-cloud-messaging-push-scope/"
    }
  );

  const messaging = getMessaging(app);

  const unsubscribeRegistration = onRegistered(
    messaging,
    (installationId) => {
      console.log("FCM Installation ID:", installationId);

      let storedInstallationId

      storedInstallationId = localStorage.getItem(
        CAMERA_NOTES_INSTALLATION_ID
      );

      if (!storedInstallationId) {
        console.log("No stored installation ID found. Storing new ID.");
        // Menyimpan FID terbaru di browser
        localStorage.setItem(
          CAMERA_NOTES_INSTALLATION_ID,
          installationId
        );
        storedInstallationId = installationId;
      }

      // Send this ID to your secure backend
      // and associate it with the current user.
      onRegistration?.(storedInstallationId);
    }
  );

  const unsubscribeMessage = onMessage(
    messaging,
    (payload) => {
      console.log("Foreground notification:", payload);
      onNotification?.(payload);
    }
  );

  try {
    await register(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: sw
    });

  } catch (error) {
    unsubscribeRegistration();
    unsubscribeMessage();
    throw error;
  }

  return () => {
    unsubscribeRegistration();
    unsubscribeMessage();
  };
}

export async function testLocalNotification({ message = "Push notification local test berhasil!" } = {}) {
  if (!("Notification" in window)) {
    throw new Error("Browser notifications unsupported");
  }

  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers unsupported");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission denied");
  }

  const registration = await navigator.serviceWorker.register(
    "firebase-messaging-sw.js"
  );

  await registration.showNotification("Camera Notes", {
    body: message,
    tag: "camera-notes-test"
  });
}

// Mengambil Installation ID lama dari Firebase
export async function getExistingInstallationId() {
  const installations = getInstallations(app);

  // Jika sudah ada, gunakan ID lama.
  // Jika belum ada, Firebase membuat ID baru.
  return await getId(installations);
}

