import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import { getDb } from '../db/connection'

export function registerTweetsIpc(): void {
  ipcMain.handle('tweets:add', (_event, threadId: string, position?: number) => {
    const db = getDb()

    if (position === undefined) {
      const maxRow = db
        .prepare('SELECT MAX(position) as maxPos FROM tweets WHERE thread_id = ?')
        .get(threadId) as { maxPos: number | null }
      position = (maxRow.maxPos ?? -1) + 1
    } else {
      db.prepare(
        'UPDATE tweets SET position = position + 1, updated_at = datetime(\'now\') WHERE thread_id = ? AND position >= ?'
      ).run(threadId, position)
    }

    const id = randomUUID()
    db.prepare('INSERT INTO tweets (id, thread_id, position, content) VALUES (?, ?, ?, ?)').run(
      id,
      threadId,
      position,
      ''
    )

    db.prepare("UPDATE threads SET updated_at = datetime('now') WHERE id = ?").run(threadId)

    return db.prepare('SELECT * FROM tweets WHERE id = ?').get(id)
  })

  ipcMain.handle(
    'tweets:update',
    (_event, id: string, data: { content?: string; position?: number }) => {
      const db = getDb()
      const sets: string[] = ["updated_at = datetime('now')"]
      const values: any[] = []

      if (data.content !== undefined) {
        sets.push('content = ?')
        values.push(data.content)
      }
      if (data.position !== undefined) {
        sets.push('position = ?')
        values.push(data.position)
      }

      values.push(id)
      db.prepare(`UPDATE tweets SET ${sets.join(', ')} WHERE id = ?`).run(...values)

      const tweet = db.prepare('SELECT * FROM tweets WHERE id = ?').get(id) as any
      if (tweet) {
        db.prepare("UPDATE threads SET updated_at = datetime('now') WHERE id = ?").run(
          tweet.thread_id
        )
      }

      return tweet
    }
  )

  ipcMain.handle('tweets:delete', (_event, id: string) => {
    const db = getDb()
    const tweet = db.prepare('SELECT * FROM tweets WHERE id = ?').get(id) as any
    if (!tweet) return

    db.prepare('DELETE FROM tweets WHERE id = ?').run(id)
    db.prepare(
      "UPDATE tweets SET position = position - 1, updated_at = datetime('now') WHERE thread_id = ? AND position > ?"
    ).run(tweet.thread_id, tweet.position)
    db.prepare("UPDATE threads SET updated_at = datetime('now') WHERE id = ?").run(
      tweet.thread_id
    )
  })

  ipcMain.handle('tweets:reorder', (_event, threadId: string, orderedIds: string[]) => {
    const db = getDb()
    const update = db.prepare(
      "UPDATE tweets SET position = ?, updated_at = datetime('now') WHERE id = ?"
    )

    const transaction = db.transaction(() => {
      for (let i = 0; i < orderedIds.length; i++) {
        update.run(i, orderedIds[i])
      }
    })
    transaction()

    db.prepare("UPDATE threads SET updated_at = datetime('now') WHERE id = ?").run(threadId)
  })
}
