import { ipcMain, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { getDb } from '../db/connection'
import { aiService } from '../services/ai.service'

export function registerAiIpc(): void {
  ipcMain.handle(
    'ai:generate-thread',
    async (
      event,
      prompt: string,
      options?: { style?: string; tweetCount?: number; systemPrompt?: string }
    ) => {
      if (!aiService.isInitialized()) {
        throw new Error('Claude API not configured')
      }

      const win = BrowserWindow.fromWebContents(event.sender)

      const tweetContents = await aiService.generateThread(prompt, options || {}, (streamEvent) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('ai:stream', streamEvent)
        }
      })

      const db = getDb()
      const threadId = randomUUID()

      const transaction = db.transaction(() => {
        db.prepare('INSERT INTO threads (id, title, ai_prompt, ai_style) VALUES (?, ?, ?, ?)').run(
          threadId,
          prompt.slice(0, 100),
          prompt,
          options?.style || 'professional'
        )

        for (let i = 0; i < tweetContents.length; i++) {
          db.prepare(
            'INSERT INTO tweets (id, thread_id, position, content) VALUES (?, ?, ?, ?)'
          ).run(randomUUID(), threadId, i, tweetContents[i])
        }
      })
      transaction()

      const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(threadId)
      const tweets = db
        .prepare('SELECT * FROM tweets WHERE thread_id = ? ORDER BY position')
        .all(threadId)

      return { ...thread, tweets }
    }
  )

  ipcMain.handle(
    'ai:regenerate-tweet',
    async (
      _event,
      tweetId: string,
      context: { threadContent: string[]; tweetIndex: number }
    ) => {
      if (!aiService.isInitialized()) {
        throw new Error('Claude API not configured')
      }

      const db = getDb()
      const tweet = db.prepare('SELECT * FROM tweets WHERE id = ?').get(tweetId) as any
      if (!tweet) throw new Error('Tweet not found')

      const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(tweet.thread_id) as any
      const newContent = await aiService.regenerateSingleTweet(
        context.threadContent,
        context.tweetIndex,
        thread?.ai_style || 'professional'
      )

      db.prepare(
        "UPDATE tweets SET content = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(newContent, tweetId)

      return db.prepare('SELECT * FROM tweets WHERE id = ?').get(tweetId)
    }
  )
}
