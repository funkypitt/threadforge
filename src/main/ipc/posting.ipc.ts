import { ipcMain, BrowserWindow } from 'electron'
import { getDb } from '../db/connection'
import { twitterService } from '../services/twitter.service'

export function registerPostingIpc(): void {
  ipcMain.handle('posting:start', async (event, threadId: string) => {
    if (!twitterService.isInitialized()) {
      throw new Error('X API credentials not configured')
    }

    const db = getDb()
    const thread = db.prepare('SELECT * FROM threads WHERE id = ?').get(threadId) as any
    if (!thread) throw new Error('Thread not found')

    db.prepare(
      "UPDATE threads SET status = 'posting', updated_at = datetime('now') WHERE id = ?"
    ).run(threadId)

    const tweets = db
      .prepare('SELECT * FROM tweets WHERE thread_id = ? ORDER BY position')
      .all(threadId) as any[]

    const tweetsWithMedia = tweets.map((tweet) => {
      const media = db
        .prepare('SELECT file_path FROM media WHERE tweet_id = ? ORDER BY position')
        .all(tweet.id) as Array<{ file_path: string }>
      return {
        content: tweet.content,
        mediaFilePaths: media.map((m) => m.file_path)
      }
    })

    const win = BrowserWindow.fromWebContents(event.sender)

    try {
      const tweetIds = await twitterService.postThread(tweetsWithMedia, (progress) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('posting:progress', { threadId, ...progress })
        }
      })

      for (let i = 0; i < tweets.length; i++) {
        db.prepare(
          "UPDATE tweets SET x_tweet_id = ?, posted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
        ).run(tweetIds[i], tweets[i].id)
      }

      db.prepare(
        "UPDATE threads SET status = 'posted', first_tweet_id = ?, posted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).run(tweetIds[0], threadId)

      if (win && !win.isDestroyed()) {
        win.webContents.send('posting:progress', {
          threadId,
          phase: 'complete',
          currentTweet: tweets.length,
          totalTweets: tweets.length
        })
      }

      return tweetIds
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      db.prepare(
        "UPDATE threads SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(message, threadId)

      if (win && !win.isDestroyed()) {
        win.webContents.send('posting:progress', {
          threadId,
          phase: 'error',
          currentTweet: 0,
          totalTweets: tweets.length,
          error: message
        })
      }

      throw error
    }
  })
}
