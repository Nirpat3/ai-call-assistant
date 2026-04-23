const CHECK_INTERVAL = 5 * 60 * 1000;
const VERSION_KEY = 'app_version';
const LAST_CHECK_KEY = 'app_version_last_check';

let updateCheckTimer: ReturnType<typeof setInterval> | null = null;
let onUpdateAvailable: ((version: string) => void) | null = null;

export function getCurrentVersion(): string {
  return localStorage.getItem(VERSION_KEY) || '0.0.0';
}

export function setCurrentVersion(version: string) {
  localStorage.setItem(VERSION_KEY, version);
}

export function onUpdate(callback: (version: string) => void) {
  onUpdateAvailable = callback;
}

async function checkForUpdate(): Promise<{ available: boolean; version: string; changelog?: string }> {
  try {
    const res = await fetch('/api/version', { cache: 'no-store' });
    if (!res.ok) return { available: false, version: getCurrentVersion() };
    const data = await res.json();
    const currentVersion = getCurrentVersion();
    const serverVersion = data.version;

    if (serverVersion && serverVersion !== currentVersion && currentVersion !== '0.0.0') {
      return { available: true, version: serverVersion, changelog: data.changelog };
    }

    if (currentVersion === '0.0.0' && serverVersion) {
      setCurrentVersion(serverVersion);
    }

    return { available: false, version: serverVersion || currentVersion };
  } catch {
    return { available: false, version: getCurrentVersion() };
  }
}

export async function applyUpdate(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));

    const res = await fetch('/api/version', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.version) setCurrentVersion(data.version);
    }

    window.location.reload();
  } catch {
    window.location.reload();
  }
}

export function startUpdateChecker() {
  checkForUpdate().then(result => {
    if (result.version && !result.available) {
      setCurrentVersion(result.version);
    }
    if (result.available && onUpdateAvailable) {
      onUpdateAvailable(result.version);
    }
  });

  if (updateCheckTimer) clearInterval(updateCheckTimer);
  updateCheckTimer = setInterval(async () => {
    const result = await checkForUpdate();
    if (result.available && onUpdateAvailable) {
      onUpdateAvailable(result.version);
    }
  }, CHECK_INTERVAL);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        if (onUpdateAvailable) onUpdateAvailable(event.data.version);
      }
      if (event.data?.type === 'FORCE_UPDATE') {
        applyUpdate();
      }
    });

    navigator.serviceWorker.ready.then(async (reg) => {
      if ('periodicSync' in reg) {
        try {
          await (reg as any).periodicSync.register('check-updates', {
            minInterval: 60 * 60 * 1000,
          });
        } catch {}
      }
    });
  }
}

export function stopUpdateChecker() {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
}

export function listenForSwUpdates() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready.then((reg) => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          if (onUpdateAvailable) {
            checkForUpdate().then(result => {
              if (result.available && onUpdateAvailable) {
                onUpdateAvailable(result.version);
              }
            });
          }
        }
      });
    });
  });
}
