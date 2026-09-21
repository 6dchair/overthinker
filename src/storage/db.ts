import type { JournalEntry } from "../types/journal";

const DB_NAME = "overthinker";
const DB_VERSION = 1;
const STORE_NAME = "entries";

const openDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };
  });
};

export const getEntries = async (): Promise<JournalEntry[]> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readonly"
    );

    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const entries = request.result as JournalEntry[];

      entries.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      resolve(entries);
    };
  });
};

export const saveEntry = async (
  entry: JournalEntry
): Promise<void> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store = transaction.objectStore(STORE_NAME);

    const request = store.put(entry);

    request.onerror = () => {
      reject(request.error);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.oncomplete = () => {
      resolve();
    };
  });
};

export const saveEntries = async (
  entries: JournalEntry[]
): Promise<void> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store = transaction.objectStore(STORE_NAME);

    entries.forEach((entry) => {
      store.put(entry);
    });

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.oncomplete = () => {
      resolve();
    };
  });
};

export const deleteEntry = async (
  entryId: string
): Promise<void> => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(entryId);

    request.onerror = () => {
      reject(request.error);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };

    transaction.oncomplete = () => {
      resolve();
    };
  });
};