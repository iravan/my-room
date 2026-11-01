// Album images live in IndexedDB (localStorage is too small for covers), keyed by a short random file name.
const DB = "my-room", STORE = "images";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) {
  const d = await db();
  return new Promise<T>((resolve, reject) => {
    const req = run(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// A friend's room keeps its images in memory only, under "visit:" names; they never touch IndexedDB.
export const VISIT = "visit:";
export const visitImages = new Map<string, Blob>();

export const getImage = (name: string) =>
  name.startsWith(VISIT) ? Promise.resolve(visitImages.get(name)) : tx<Blob | undefined>("readonly", (s) => s.get(name));
export const putImage = (name: string, blob: Blob) => tx("readwrite", (s) => s.put(blob, name));

export function checkSize(bytes: number) {
  if (bytes > MAX_IMAGE_BYTES) throw new Error(`Image is ${(bytes / 1048576).toFixed(1)} MB; the limit is 10 MB.`);
}

// Image bytes (e.g. from a file picker) → stored name. Throws if too big.
export async function importImage(blob: Blob) {
  checkSize(blob.size);
  const name = crypto.randomUUID().replace(/-/g, "").slice(0, 8) + ".img";
  await putImage(name, blob);
  return name;
}
