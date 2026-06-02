import { ipcMain, BrowserWindow } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { getDb } from '../db/connection'
import { archiveService } from '../services/archive.service'
import { aiService } from '../services/ai.service'

function getArchivesDir(): string {
  return join(__dirname, '../../archives')
}

export function registerArchiveIpc(): void {
  ipcMain.handle('archive:load', () => {
    const dir = getArchivesDir()
    const count = archiveService.loadArchives(dir)
    return { loaded: true, tweetCount: count }
  })

  ipcMain.handle('archive:search', (_event, query: string, limit?: number) => {
    return archiveService.searchTweets(query, limit)
  })

  ipcMain.handle('archive:status', () => {
    return {
      loaded: archiveService.isLoaded(),
      tweetCount: archiveService.getTweetCount()
    }
  })

  ipcMain.handle(
    'archive:generate-thread',
    async (
      event,
      query: string,
      options?: { style?: string; tweetCount?: number }
    ) => {
      if (!aiService.isInitialized()) {
        throw new Error('Claude API not configured')
      }

      const matchingTweets = archiveService.searchTweets(query, 200)
      if (matchingTweets.length === 0) {
        throw new Error(`No tweets found matching "${query}"`)
      }

      const tweetSummary = matchingTweets
        .map((t) => `[${t.created_at}] ${t.text}`)
        .join('\n\n')

      const count = options?.tweetCount || 7
      const style = options?.style || 'professional'

      const systemPrompt = `You are a Twitter/X thread writer. Based on the user's tweet archive data below, create a thread of ${count} tweets.

Rules:
- Each tweet MUST be under 280 characters
- Return tweets separated by ---TWEET_BREAK---
- Synthesize and summarize the archive content chronologically where applicable
- Use a ${style} tone
- Do NOT include tweet numbers like "1/" or "Thread:"
- Reference specific dates, facts, and details from the archive data
- First tweet should hook the reader, last should summarize or call to action

ARCHIVE DATA (${matchingTweets.length} matching tweets):
${tweetSummary}`

      const win = BrowserWindow.fromWebContents(event.sender)

      const tweetContents = await aiService.generateThread(
        `Create a thread about: ${query}`,
        { style, tweetCount: count, systemPrompt },
        (streamEvent) => {
          if (win && !win.isDestroyed()) {
            win.webContents.send('ai:stream', streamEvent)
          }
        }
      )

      const db = getDb()
      const threadId = randomUUID()

      const transaction = db.transaction(() => {
        db.prepare(
          'INSERT INTO threads (id, title, ai_prompt, ai_style) VALUES (?, ?, ?, ?)'
        ).run(threadId, `Archive: ${query.slice(0, 80)}`, query, style)

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
}
