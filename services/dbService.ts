import { GenerationMode } from '../types';

const DB_NAME = 'geminiVisionStudioDB';
const STORE_NAME = 'sessionStore';
const DB_VERSION = 1;
const SESSION_KEY = 'userSession';

export interface SessionData {
  id: string;
  brief: string;
  editBrief: string;
  generationMode: GenerationMode;
  imageCount: number;
  referenceImages: File[];
  backgroundImage: File | null;
  editImage: File | null;
  sketchImage: File | null;
  floorplanImage: File | null;
  relatedImageBase: File | null;
}

let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
      reject("Error opening database");
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveSession = async (sessionData: Omit<SessionData, 'id'>): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  const dataToStore: SessionData = { ...sessionData, id: SESSION_KEY };

  const request = store.put(dataToStore);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve();
    };
    request.onerror = (event) => {
      console.error("Error saving session to IndexedDB:", (event.target as IDBRequest).error);
      reject("Failed to save session");
    };
  });
};

export const loadSession = async (): Promise<Omit<SessionData, 'id'> | null> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.get(SESSION_KEY);

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const result = (event.target as IDBRequest).result as SessionData | undefined;
      if (result) {
        // File objects are retrieved directly from IndexedDB
        const { id, ...sessionData } = result;
        resolve(sessionData);
      } else {
        resolve(null);
      }
    };
    request.onerror = (event) => {
      console.error("Error loading session from IndexedDB:", (event.target as IDBRequest).error);
      reject("Failed to load session");
    };
  });
};
