// Offline storage using IndexedDB for artwork data
const DB_NAME = "StatueFinderDB";
const DB_VERSION = 1;
const STORE_NAME = "artworks";

interface ArtworkData {
  id: string;
  data: any;
  timestamp: number;
}

export const initOfflineDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

export const saveArtworkOffline = async (id: string, data: any) => {
  try {
    const db = await initOfflineDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const artworkData: ArtworkData = {
      id,
      data,
      timestamp: Date.now(),
    };

    store.put(artworkData);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Error saving artwork offline:", error);
    return false;
  }
};

export const getArtworkOffline = async (id: string): Promise<any | null> => {
  try {
    const db = await initOfflineDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result as ArtworkData | undefined;
        if (result && Date.now() - result.timestamp < 7 * 24 * 60 * 60 * 1000) {
          // Cache for 7 days
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error getting artwork offline:", error);
    return null;
  }
};

export const getAllArtworksOffline = async (): Promise<any[]> => {
  try {
    const db = await initOfflineDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result as ArtworkData[];
        const validData = results
          .filter(item => Date.now() - item.timestamp < 7 * 24 * 60 * 60 * 1000)
          .map(item => item.data);
        resolve(validData);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Error getting all artworks offline:", error);
    return [];
  }
};

export const clearOfflineData = async () => {
  try {
    const db = await initOfflineDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Error clearing offline data:", error);
    return false;
  }
};
