import { UAParser } from 'ua-parser-js';

export function getDeviceInfo() {
  const parser = new UAParser();
  const result = parser.getResult();

  const deviceModel = result.device.model; 
  const deviceVendor = result.device.vendor; 
  const osName = result.os.name || 'Unknown OS';

  // Jika model terdeteksi (biasanya HP/Tablet)
  if (deviceModel) {
    return `${deviceModel} - ${osName}`;
  } 
  
  // Jika hanya vendor yang terdeteksi
  if (deviceVendor) {
    return `${deviceVendor} Device - ${osName}`;
  } 
  
  // Untuk PC/Laptop (Desktop)
  return `Desktop (${osName})`;
}