import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

export function getMediaDir(threadId: string): string {
  const dir = join(app.getPath('userData'), 'media', threadId)
  mkdirSync(dir, { recursive: true })
  return dir
}

export function getMigrationsDir(): string {
  return join(__dirname, '..', '..', 'src', 'main', 'db', 'migrations')
}
