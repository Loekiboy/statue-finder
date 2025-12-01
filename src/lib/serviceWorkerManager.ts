// Service Worker Registration and Management

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
      });

      console.log('Service Worker registered successfully:', registration.scope);

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              console.log('New service worker available');
              
              // Optionally notify user to refresh
              if (window.confirm('Er is een nieuwe versie beschikbaar. Wil je de pagina herladen?')) {
                window.location.reload();
              }
            }
          });
        }
      });

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

export const unregisterServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    console.log('Service Worker unregistered');
  }
};

// Check if app is running in standalone mode (installed as PWA)
export const isStandalone = (): boolean => {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
};

// Request background sync for offline uploads
export const requestBackgroundSync = async (tag: string) => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration) {
        await (registration as any).sync.register(tag);
        console.log('Background sync registered:', tag);
      }
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }
};

// Cache artwork data for offline access
export const cacheArtworkData = async (artworkId: string, data: any) => {
  if ('caches' in window) {
    try {
      const cache = await caches.open('artwork-data');
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
      await cache.put(`/artwork/${artworkId}`, response);
      console.log('Artwork cached:', artworkId);
    } catch (error) {
      console.error('Cache error:', error);
    }
  }
};

// Get cached artwork data
export const getCachedArtworkData = async (artworkId: string): Promise<any | null> => {
  if ('caches' in window) {
    try {
      const cache = await caches.open('artwork-data');
      const response = await cache.match(`/artwork/${artworkId}`);
      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.error('Cache retrieval error:', error);
    }
  }
  return null;
};

// Check online status
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Add event listeners for online/offline status
export const setupOnlineStatusListeners = (
  onOnline: () => void,
  onOffline: () => void
) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};
