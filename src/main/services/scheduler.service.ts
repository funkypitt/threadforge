import * as schedule from 'node-schedule'
import type { BrowserWindow } from 'electron'
import { getDb } from '../db/connection'
import { twitterService } from './twitter.service'

export class SchedulerService {
  private jobs = new Map<string, schedule.Job>()
  private mainWindow: BrowserWindow | null = null

  setWindow(win: BrowserWindow): void {
    this.mainWindow = win
  }

  restoreSchedules(): void {
    const db = getDb()
    const rows = db
      .prepare(
        `SELECT id, scheduled_at FROM threads WHERE status = 'scheduled' AND scheduled_at IS NOT NULL`
      )
      .all() as Array<{ id: string; scheduled_at: string }>

    for (const row of rows) {
      const scheduledDate = new Date(row.scheduled_at)
      if (scheduledDate <= new Date()) {
        this.executePost(row.id)
      } else {
        this.registerJob(row.id, scheduledDate)
      }
    }
  }

  scheduleThread(threadId: string, scheduledAt: Date): void {
    this.cancelJob(threadId)

    const db = getDb()
    db.prepare(
      `UPDATE threads SET status = 'scheduled', scheduled_at = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(scheduledAt.toISOString(), threadId)

    this.registerJob(threadId, scheduledAt)
  }

  cancelSchedule(threadId: string): void {
    this.cancelJob(threadId)

    const db = getDb()
    db.prepare(
      `UPDATE threads SET status = 'draft', scheduled_at = NULL, updated_at = datetime('now') WHERE id = ?`
    ).run(threadId)
  }

  private registerJob(threadId: string, date: Date): void {
    const job = schedule.scheduleJob(date, () => {
      this.executePost(threadId)
    })
    if (job) {
      this.jobs.set(threadId, job)
    }
  }

  private cancelJob(threadId: string): void {
    const job = this.jobs.get(threadId)
    if (job) {
      job.cancel()
      this.jobs.delete(threadId)
    }
  }

  private async executePost(threadId: string): Promise<void> {
    if (!twitterService.isInitialized()) return

    const db = getDb()
    db.prepare(`UPDATE threads SET status = 'posting', updated_at = datetime('now') WHERE id = ?`).run(
      threadId
    )

    const tweets = db
      .prepare(
        `SELECT t.id, t.content, t.position FROM tweets t WHERE t.thread_id = ? ORDER BY t.position`
      )
      .all(threadId) as Array<{ id: string; content: string; position: number }>

    const tweetsWithMedia = tweets.map((tweet) => {
      const media = db
        .prepare(`SELECT file_path FROM media WHERE tweet_id = ? ORDER BY position`)
        .all(tweet.id) as Array<{ file_path: string }>
      return {
        content: tweet.content,
        mediaFilePaths: media.map((m) => m.file_path)
      }
    })

    try {
      const tweetIds = await twitterService.postThread(tweetsWithMedia, (event) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('posting:progress', { threadId, ...event })
        }
      })

      for (let i = 0; i < tweets.length; i++) {
        db.prepare(
          `UPDATE tweets SET x_tweet_id = ?, posted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
        ).run(tweetIds[i], tweets[i].id)
      }

      db.prepare(
        `UPDATE threads SET status = 'posted', first_tweet_id = ?, posted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).run(tweetIds[0], threadId)

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('posting:progress', {
          threadId,
          phase: 'complete',
          currentTweet: tweets.length,
          totalTweets: tweets.length
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      db.prepare(
        `UPDATE threads SET status = 'failed', error_message = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(message, threadId)

      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('posting:progress', {
          threadId,
          phase: 'error',
          currentTweet: 0,
          totalTweets: tweets.length,
          error: message
        })
      }
    }
  }
}

export const schedulerService = new SchedulerService()
