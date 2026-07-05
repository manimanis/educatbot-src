
/**
 * Service de stockage local (LocalStorage + IndexedDB fallback).
 *
 * - LocalStorage : paramètres IA, thème, préférences, profil actif.
 * - IndexedDB    : conversations et messages (volumes plus importants).
 *
 * Aucune donnée n'est envoyée vers un serveur.
 */

const LS_PREFIX = 'educat_'

/* =========================================================
   LocalStorage helpers
   ========================================================= */

export const storage = {
  get(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key)
      if (raw === null || raw === undefined) return defaultValue
      return JSON.parse(raw)
    } catch (e) {
      console.warn('[storage] get failed for', key, e)
      return defaultValue
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value))
      return true
    } catch (e) {
      console.error('[storage] set failed for', key, e)
      return false
    }
  },

  remove(key) {
    localStorage.removeItem(LS_PREFIX + key)
  },

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(LS_PREFIX))
      .forEach(k => localStorage.removeItem(k))
  }
}

/* =========================================================
   IndexedDB — pour les conversations
   ========================================================= */

const DB_NAME = 'educat-db'
const DB_VERSION = 1
const STORE_CONVERSATIONS = 'conversations'
const STORE_MESSAGES = 'messages'

let dbPromise = null

function getDB() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB non supporté par ce navigateur'))
      return
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
        const convStore = db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' })
        convStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        convStore.createIndex('pinned', 'pinned', { unique: false })
        convStore.createIndex('favorite', 'favorite', { unique: false })
        convStore.createIndex('mode', 'mode', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
        const msgStore = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' })
        msgStore.createIndex('conversationId', 'conversationId', { unique: false })
        msgStore.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null
      reject(req.error)
    }
  })

  return dbPromise
}

function txStore(db, store, mode = 'readonly') {
  if (!db.objectStoreNames.contains(store)) {
    throw new Error(`Object store '${store}' introuvable`)
  }
  return db.transaction(store, mode).objectStore(store)
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    if (!req) {
      reject(new Error('reqToPromise: req est undefined'))
      return
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/* ---------- Conversations ---------- */

export async function saveConversation(conversation) {
  const db = await getDB()
  // Convert to plain object to avoid IndexedDB cloning issues with Vue proxies
  const plainConversation = JSON.parse(JSON.stringify(conversation))
  return reqToPromise(txStore(db, STORE_CONVERSATIONS, 'readwrite').put(plainConversation))
}

export async function getConversation(id) {
  const db = await getDB()
  return reqToPromise(txStore(db, STORE_CONVERSATIONS).get(id))
}

export async function getAllConversations() {
  const db = await getDB()
  const conversations = await reqToPromise(txStore(db, STORE_CONVERSATIONS).getAll())
  return conversations
}

export async function deleteConversation(id) {
  try {
    const db = await getDB()
    const tx = db.transaction([STORE_CONVERSATIONS, STORE_MESSAGES], 'readwrite')
    tx.objectStore(STORE_CONVERSATIONS).delete(id)
    // Supprime aussi les messages liés
    const msgStore = tx.objectStore(STORE_MESSAGES)
    const index = msgStore.index('conversationId')
    const cursorReq = index.openCursor(IDBKeyRange.only(id))
    await new Promise((resolve, reject) => {
      cursorReq.onsuccess = (e) => {
        const cursor = e.target.result
        if (cursor) { msgStore.delete(cursor.primaryKey); cursor.continue() }
        else resolve()
      }
      cursorReq.onerror = () => reject(cursorReq.error)
    })
    return tx.done
  } catch (e) {
    console.error('[storage] deleteConversation error', e)
    // Même en cas d'erreur IndexedDB, on nettoie le state local
    return Promise.resolve()
  }
}

/* ---------- Messages ---------- */

export async function saveMessage(message) {
  const db = await getDB()
  // Convert to plain object to avoid IndexedDB cloning issues with Vue proxies
  const plainMessage = JSON.parse(JSON.stringify(message))
  return reqToPromise(txStore(db, STORE_MESSAGES, 'readwrite').put(plainMessage))
}

export async function getMessages(conversationId) {
  const db = await getDB()
  const index = txStore(db, STORE_MESSAGES).index('conversationId')
  const all = await reqToPromise(index.getAll(IDBKeyRange.only(conversationId)))
  // Tri par date de création
  return all.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export async function deleteMessage(id) {
  const db = await getDB()
  return reqToPromise(txStore(db, STORE_MESSAGES, 'readwrite').delete(id))
}

export async function clearAllData() {
  storage.clear()
  const db = await getDB()
  const tx = db.transaction([STORE_CONVERSATIONS, STORE_MESSAGES], 'readwrite')
  tx.objectStore(STORE_CONVERSATIONS).clear()
  tx.objectStore(STORE_MESSAGES).clear()
  return tx.done
}
