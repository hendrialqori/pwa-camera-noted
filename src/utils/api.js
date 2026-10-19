import axios from "axios";

const VITE_ENDPOINT_URL = "https://aylin-sphygmoid-pierce.ngrok-free.dev/api"; // Replace with your actual backend URL

export const syncInstallationId = async ({ installationId, deviceInfo } = {}) => {
	try {
		const response = await axios.post(`${VITE_ENDPOINT_URL}/users`, {
			installation_id: installationId,
			device: deviceInfo
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