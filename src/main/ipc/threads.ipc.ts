import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { getDb } from '../db/connection'

export function registerThreadsIpc(): void {
  ipcMain.handle('threads:list', (_event, filter?: { status?: string }) => {
    const db = getDb()
    if (filter?.status) {
      return db
        .prepare('SELECT * FROM threads WHERE status = ? ORDER BY updated_at DESC')
        .all(filter.status)
    }
    return db.prepare('SELECT * FROM threads ORDER BY updated_at DESC').all()
  })

  ipcMain.handle('threads:get', (_event, id: string) => {
    const db = getDb()
    const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(id)
    if (!thread) return null

    const tweets = db
      .prepare('SELECT * FROM tweets WHERE thread_id = ? ORDER BY position')
      .all(id)

    const tweetsWithMedia = (tweets as any[]).map((tweet) => {
      const media = db
        .prepare('SELECT * FROM media WHERE tweet_id = ? ORDER BY position')
        .all(tweet.id)
      return { ...tweet, media }
    })

    return { ...thread, tweets: tweetsWithMedia }
  })

  ipcMain.handle('threads:create', (_event, data?: { title?: string }) => {
    const db = getDb()
    const threadId = randomUUID()
    const tweetId = randomUUID()

    const insertThread = db.prepare(
      'INSERT INTO threads (id, title) VALUES (?, ?)'
    )
    const insertTweet = db.prepare(
      'INSERT INTO tweets (id, thread_id, position, content) VALUES (?, ?, ?, ?)'
    )

    const transaction = db.transaction(() => {
      insertThread.run(threadId, data?.title || '')
      insertTweet.run(tweetId, threadId, 0, '')
    })
    transaction()

    return db.prepare('SELECT * FROM threads WHERE id = ?').get(threadId)
  })

  ipcMain.handle(
    'threads:update',
    (_event, id: string, data: { title?: string; status?: string; scheduled_at?: string | null }) => {
      const db = getDb()
      const sets: string[] = ['updated_at = datetime(\'now\')']
      const values: any[] = []

      if (data.title !== undefined) {
        sets.push('title = ?')
        values.push(data.title)
      }
      if (data.status !== undefined) {
        sets.push('status = ?')
        values.push(data.status)
      }
      if (data.scheduled_at !== undefined) {
        sets.push('scheduled_at = ?')
        values.push(data.scheduled_at)
      }

      values.push(id)
      db.prepare(`UPDATE threads SET ${sets.join(', ')} WHERE id = ?`).run(...values)

      return db.prepare('SELECT * FROM threads WHERE id = ?').get(id)
    }
  )

  ipcMain.handle('threads:delete', (_event, id: string) => {
    const db = getDb()
    db.prepare('DELETE FROM threads WHERE id = ?').run(id)
  })
}
