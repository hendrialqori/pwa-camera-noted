
import {
	getMessaging,
	isSupported,
	onMessage,
	onRegistered,
	register,
} from "firebase/messaging";
import { getInstallations, getId } from "firebase/installations";

import { app } from "../../firebase";
import { VAPID_KEY, } from "@/constant/firebase";
import { CAMERA_NOTES_INSTALLATION_ID } from "@/constant/localStorage";

const swFile = "/firebase-messaging-sw.js";
const swScope = "/firebase-cloud-messaging-push-scope/";

export async function setupPushNotifications(onNotification, onRegistration) {
	// check if the browser supports notifications and service workers
	checkNotificationSupport();

	// create a service worker registration for Firebase Messaging
	const sw = await navigator.serviceWorker.register(swFile, { scope: swScope }
	);

	// get the Firebase Messaging instance
	const messaging = getMessaging(app);

	// listen for registration and get the FCM Installation ID
	const unsubscribeRegistration = onRegistered(
		messaging,
		(installationId) => {

			let storedInstallationId

			 storedInstallationId =
				localStorage.getItem(CAMERA_NOTES_INSTALLATION_ID);

			if (storedInstallationId !== installationId) {
				localStorage.setItem(CAMERA_NOTES_INSTALLATION_ID, installationId);
				storedInstallationId = installationId;
			}

			// Send this ID to your secure backend
			// and associate it with the current user.
			onRegistration?.(storedInstallationId);
		}
	);

	// listen for incoming messages
	const unsubscribeMessage = onMessage(
		messaging,
		async (payload) => onNotification?.(payload)
	);

	try {

		// register the service worker with Firebase Messaging using the VAPID key
		await register(messaging, {
			vapidKey: VAPID_KEY,
			serviceWorkerRegistration: sw
		});

	} catch (error) {
		console.error("Error setting up push notifications:", error);

		unsubscribeRegistration();
		unsubscribeMessage();

		throw error;
	}

	// return a cleanup function to unsubscribe from registration and message listeners
	return () => {
		unsubscribeRegistration();
		unsubscribeMessage();
	};
}


export async function testLocalNotification({
	message = "Push notification local test berhasil!" } = {}
) {
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
		swFile, { scope: swScope }
	);

	await registration.showNotification("Camera Notes Notification", {
		body: message,
		tag: "camera-notes-local-notification-test",
	});
}


// Get existing installation ID from Firebase Installations
export async function getExistingInstallationId() {
	const installations = getInstallations(app);
	return await getId(installations);
}

async function checkNotificationSupport() {
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
}

export async function checkPushSubscription() {
	const registrations =
		await navigator.serviceWorker.getRegistrations();

	for (const registration of registrations) {
		const subscription =
			await registration.pushManager.getSubscription();

		alert(JSON.stringify({
			serviceWorker: registration.active?.scriptURL,
			scope: registration.scope,
			subscribed: Boolean(subscription),
			endpoint: subscription
				? new URL(subscription.endpoint).origin
				: null
		}, null, 2));
	}
}

