/**
 * db.js — IndexedDB 本地存储层
 *
 * 使用 idb 库，数据库名 'investment-ledger'，版本 1。
 * 两个 object store：holdings、settings
 */

import { openDB } from 'idb'

const DB_NAME = 'investment-ledger'
const DB_VERSION = 1

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 创建 holdings store
        if (!db.objectStoreNames.contains('holdings')) {
          db.createObjectStore('holdings', { keyPath: 'id' })
        }
        // 创建 settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

// ─── 加载所有持仓 ───────────────────────────────────────────────
export async function loadHoldings() {
  try {
    const db = await getDB()
    const all = await db.getAll('holdings')
    return all.length > 0 ? all : []
  } catch (err) {
    console.error('[db] loadHoldings failed:', err)
    return []
  }
}

// ─── 保存所有持仓 ───────────────────────────────────────────────
export async function saveHoldings(data) {
  try {
    const db = await getDB()
    const tx = db.transaction('holdings', 'readwrite')
    const store = tx.objectStore('holdings')
    // 清空旧数据
    await store.clear()
    // 写入新数据
    for (const item of data) {
      await store.put(item)
    }
    await tx.done
    console.log(`[db] saveHoldings ok: ${data.length} items`)
    return true
  } catch (err) {
    console.error('[db] saveHoldings failed:', err)
    return false
  }
}

// ─── 加载设置 ───────────────────────────────────────────────────
export async function loadSettings() {
  try {
    const db = await getDB()
    const fxUSD = await db.get('settings', 'fx_USD')
    const fxHKD = await db.get('settings', 'fx_HKD')
    const autoRefresh = await db.get('settings', 'autoRefresh')
    return {
      fx: {
        USD: fxUSD?.value ?? 7.28,
        HKD: fxHKD?.value ?? 0.925,
      },
      autoRefresh: autoRefresh?.value ?? true,
    }
  } catch (err) {
    console.error('[db] loadSettings failed:', err)
    return { fx: { USD: 7.28, HKD: 0.925 }, autoRefresh: true }
  }
}

// ─── 保存设置 ───────────────────────────────────────────────────
export async function saveSettings(data) {
  try {
    const db = await getDB()
    const tx = db.transaction('settings', 'readwrite')
    const store = tx.objectStore('settings')
    await store.put({ key: 'fx_USD', value: data.fx.USD })
    await store.put({ key: 'fx_HKD', value: data.fx.HKD })
    await store.put({ key: 'autoRefresh', value: data.autoRefresh })
    await tx.done
  } catch (err) {
    console.error('[db] saveSettings failed:', err)
  }
}
