const DB_NAME = "chatapp-secure";
const DB_VERSION = 1;
const DEVICE_STORE = "deviceKeys";
const SESSION_STORE = "sessions";

let dbPromise;

const getDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DEVICE_STORE)) {
        db.createObjectStore(DEVICE_STORE, { keyPath: "userId" });
      }
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: "userId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
};

const txStore = async (storeName, mode) => {
  const db = await getDb();
  return db.transaction(storeName, mode).objectStore(storeName);
};

export const setDeviceKeys = async (userId, data) => {
  const store = await txStore(DEVICE_STORE, "readwrite");
  await new Promise((resolve, reject) => {
    const req = store.put({ userId, data });
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
};

export const getDeviceKeys = async (userId) => {
  const store = await txStore(DEVICE_STORE, "readonly");
  return new Promise((resolve, reject) => {
    const req = store.get(userId);
    req.onsuccess = () => resolve(req.result ? req.result.data : null);
    req.onerror = () => reject(req.error);
  });
};

export const setSessions = async (userId, sessions) => {
  const store = await txStore(SESSION_STORE, "readwrite");
  await new Promise((resolve, reject) => {
    const req = store.put({ userId, data: sessions });
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
};

export const getSessions = async (userId) => {
  const store = await txStore(SESSION_STORE, "readonly");
  return new Promise((resolve, reject) => {
    const req = store.get(userId);
    req.onsuccess = () => resolve(req.result ? req.result.data : {});
    req.onerror = () => reject(req.error);
  });
};

// Clear all crypto data (useful when key derivation changes)
export const clearAllCryptoData = async () => {
  const db = await getDb();
  const tx = db.transaction([DEVICE_STORE, SESSION_STORE], "readwrite");
  await Promise.all([
    new Promise((resolve, reject) => {
      const req = tx.objectStore(DEVICE_STORE).clear();
      req.onsuccess = resolve;
      req.onerror = () => reject(req.error);
    }),
    new Promise((resolve, reject) => {
      const req = tx.objectStore(SESSION_STORE).clear();
      req.onsuccess = resolve;
      req.onerror = () => reject(req.error);
    }),
  ]);
  console.log("[storage] Cleared all crypto data");
};
