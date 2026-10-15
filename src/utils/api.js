import axios from "axios";

const VITE_ENDPOINT_URL = "https://3d34-2404-c0-ca01-7356-1521-9088-3493-6333.ngrok-free.app/api"; // Replace with your actual backend URL

export const syncInstallationId = async (installationId) => {
	try {
		const response = await axios.post(`${VITE_ENDPOINT_URL}/users`, {
			installation_id: installationId
		});
		return response.data;
	} catch (error) {
		console.error("Error syncing installation ID:", error);
		throw error;
	}
}

export const sendBroadcastNotification = async (title, body) => {
	try {
		const response = await axios.post(`${VITE_ENDPOINT_URL}/notifications/broadcast`, {
			title,
			body
		});
		return response.data;
	} catch (error) {
		console.error("Error sending broadcast notification:", error);
		throw error;
	}
}