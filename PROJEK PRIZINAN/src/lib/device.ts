const DEVICE_STORAGE_KEY = 'perizinan_device_id';

export interface DeviceInfo {
  deviceName: string;
  browser: string;
  os: string;
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-device';
  }

  let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);

  if (!deviceId) {
    if (
      typeof crypto !== 'undefined' &&
      typeof crypto.randomUUID === 'function'
    ) {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}`;
    }

    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  }

  return deviceId;
}

export function getDeviceInfo(): DeviceInfo {
  if (typeof navigator === 'undefined') {
    return {
      deviceName: 'Unknown Device',
      browser: 'Unknown Browser',
      os: 'Unknown OS',
    };
  }

  const ua = navigator.userAgent;

  let os = 'Unknown OS';
  let deviceName = 'Computer';

  // =========================
  // OS
  // =========================

  if (/Android/i.test(ua)) {
    os = 'Android';
    deviceName = 'Android Device';
  } else if (/iPhone/i.test(ua)) {
    os = 'iOS';
    deviceName = 'iPhone';
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS';
    deviceName = 'iPad';
  } else if (/Mac OS X/i.test(ua)) {
    os = 'macOS';
    deviceName = 'Mac';
  } else if (/Windows/i.test(ua)) {
    os = 'Windows';
    deviceName = 'Windows PC';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    deviceName = 'Linux PC';
  }

  // =========================
  // Browser
  // =========================

  let browser = 'Unknown Browser';

  if (/SamsungBrowser/i.test(ua)) {
    browser = 'Samsung Internet';
  } else if (/Edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/OPR/i.test(ua)) {
    browser = 'Opera';
  } else if (/Firefox/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/Chrome/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/Safari/i.test(ua)) {
    browser = 'Safari';
  }

  return {
    deviceName,
    browser,
    os,
  };
}
