import type { QueuedOperation } from "@/lib/offline/queue"

// The offline queue on the phone (IndexedDB, built into the browser: no library). Browser only.
// An operation stays here until the server has it, then it is deleted, customer number included.

const DATABASE = "afrisaytu-offline"
const STORE = "operations"
export const QUEUE_EVENT = "afrisaytu:offline-queue" // any change: the screens read the queue again

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "key" })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await openDatabase()
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode)
      const request = work(transaction.objectStore(STORE))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally {
    database.close()
  }
}

function changed() {
  window.dispatchEvent(new Event(QUEUE_EVENT))
}

// Empty when the browser has no IndexedDB or refuses it (private mode): nothing is waiting.
export async function readQueue(): Promise<QueuedOperation[]> {
  if (typeof indexedDB === "undefined") return []
  try {
    return await run("readonly", (store) => store.getAll() as IDBRequest<QueuedOperation[]>)
  } catch {
    return []
  }
}

// Throws when the phone cannot keep it: the caller tells the agent.
export async function keepOperation(item: QueuedOperation): Promise<void> {
  await run("readwrite", (store) => store.put(item))
  changed()
}

export async function dropOperation(key: string): Promise<void> {
  await run("readwrite", (store) => store.delete(key))
  changed()
}
