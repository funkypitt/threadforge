import { safeStorage } from 'electron'
import { getDb } from '../db/connection'

export function setSecureSetting(key: string, value: string): void {
  const db = getDb()
  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value)
    const base64 = encrypted.toString('base64')
    db.prepare('INSERT OR REPLACE INTO settings (key, value, encrypted) VALUES (?, ?, 1)').run(
      key,
      base64
    )
  } else {
    db.prepare('INSERT OR REPLACE INTO settings (key, value, encrypted) VALUES (?, ?, 0)').run(
      key,
      JSON.stringify(value)
    )
  }
}

export function getSecureSetting(key: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT value, encrypted FROM settings WHERE key = ?').get(key) as
    | { value: string; encrypted: number }
    | undefined
  if (!row) return null
  if (row.encrypted && safeStorage.isEncryptionAvailable()) {
    const buffer = Buffer.from(row.value, 'base64')
    return safeStorage.decryptString(buffer)
  }
  return row.encrypted ? null : JSON.parse(row.value)
}

export function setSetting(key: string, value: unknown): void {
  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO settings (key, value, encrypted) VALUES (?, ?, 0)').run(
    key,
    JSON.stringify(value)
  )
}

export function getSetting(key: string): unknown | null {
  const db = getDb()
  const row = db.prepare('SELECT value, encrypted FROM settings WHERE key = ?').get(key) as
    | { value: string; encrypted: number }
    | undefined
  if (!row || row.encrypted) return null
  return JSON.parse(row.value)
}
