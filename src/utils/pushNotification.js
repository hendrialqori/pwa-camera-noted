
import {
  getMessaging,
  isSupported,
  onMessage,
  onRegistered,
  register
} from "firebase/messaging";

import { app } from "../../firebase";
import { WEB_PUSH_CERTIFICATE_KEY } from "../constant/firebase";

const VAPID_KEY = WEB_PUSH_CERTIFICATE_KEY;

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
    "firebase-messaging-sw.js"
  );

  const messaging = getMessaging(app);

  const unsubscribeRegistration = onRegistered(
    messaging,
    (installationId) => {
      console.log("FCM Installation ID:", installationId);

      // Send this ID to your secure backend
      // and associate it with the current user.
      onRegistration?.(installationId);
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


export async function testLocalNotification() {
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
    body: "Push notification local test berhasil!",
    tag: "camera-notes-test"
  });
}
