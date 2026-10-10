// Utility to get or generate anonymous device ID stored in localStorage and cookie
export function getOrCreateDeviceId() {
  const STORAGE_KEY = 'khitmah_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);

  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    }
    localStorage.setItem(STORAGE_KEY, deviceId);
  }

  // Ensure cookie is set for server recognition
  try {
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(deviceId)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (e) {
    // ignore cookie errors
  }

  return deviceId;
}
