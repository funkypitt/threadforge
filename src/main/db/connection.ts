import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  const userDataPath = app.getPath('userData')
  mkdirSync(userDataPath, { recursive: true })

  const dbPath = join(userDataPath, 'threadforge.db')
  _db = new Database(dbPath)

  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')

  return _db
}

export function closeDb(): void {
  if (_db) {
    _db.close()
    _db = null
  }
}
