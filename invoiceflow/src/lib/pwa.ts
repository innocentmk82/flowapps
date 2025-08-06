// PWA Service Worker Registration
export const registerSW = async () => {
  if ('serviceWorker' in navigator) {
    try {
      console.log('Registering service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      if (registration.installing) {
        console.log('Service worker installing');
      } else if (registration.waiting) {
        console.log('Service worker installed');
      } else if (registration.active) {
        console.log('Service worker active');
      }

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show update prompt
              if (confirm('New version available! Reload to update?')) {
                window.location.reload();
              }
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  } else {
    console.log('Service worker not supported');
  }
};

// Check if app is installed
export const isAppInstalled = (): boolean => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (window.navigator as any).standalone === true;
  const isAndroidApp = document.referrer.includes('android-app://');
  
  console.log('App install check:', { isStandalone, isIOSStandalone, isAndroidApp });
  
  return isStandalone || isIOSStandalone || isAndroidApp;
};

// Check if app can be installed
export const canInstallApp = (): boolean => {
  const canInstall = 'BeforeInstallPromptEvent' in window;
  console.log('Can install app:', canInstall);
  return canInstall;
};

// Get install prompt
export const getInstallPrompt = (): Promise<any> => {
  return new Promise((resolve) => {
    const handler = (e: any) => {
      console.log('Install prompt received');
      e.preventDefault();
      resolve(e);
    };
    window.addEventListener('beforeinstallprompt', handler, { once: true });
  });
};

// Debug PWA status
export const debugPWAStatus = () => {
  console.log('PWA Debug Info:', {
    serviceWorker: 'serviceWorker' in navigator,
    beforeInstallPrompt: 'BeforeInstallPromptEvent' in window,
    isInstalled: isAppInstalled(),
    displayMode: window.matchMedia('(display-mode: standalone)').matches,
    navigatorStandalone: (window.navigator as any).standalone,
    referrer: document.referrer,
    userAgent: navigator.userAgent
  });
}; 