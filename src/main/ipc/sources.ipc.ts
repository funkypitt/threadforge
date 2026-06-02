import { ipcMain, dialog, BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { getDb } from '../db/connection'
import { documentService } from '../services/document.service'
import { archiveService } from '../services/archive.service'
import { transcriptionService } from '../services/transcription.service'
import { aiService } from '../services/ai.service'
import { join } from 'path'

import { is } from '@electron-toolkit/utils'

function getArchivesDir(): string {
  if (is.dev) {
    return join(__dirname, '../../archives')
  }
  return join(process.resourcesPath, '..', 'archives')
}

export function registerSourcesIpc(): void {
  ipcMain.handle('sources:select-files', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Documents',
          extensions: ['pdf', 'epub', 'docx', 'html', 'htm', 'txt', 'md', 'json', 'csv']
        }
      ]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('sources:extract-text', (_event, filePath: string) => {
    return documentService.extractText(filePath)
  })

  ipcMain.handle('sources:select-media-files', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Audio/Video',
          extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'flac', 'ogg', 'm4a']
        }
      ]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('sources:transcribe-file', async (_event, filePath: string) => {
    return transcriptionService.transcribeFile(filePath)
  })

  ipcMain.handle('sources:transcribe-youtube', async (_event, url: string) => {
    return transcriptionService.transcribeYouTube(url)
  })

  ipcMain.handle(
    'sources:generate-from-transcription',
    async (
      event,
      options: {
        transcription: string
        source: string
        prompt: string
        style?: string
        tweetCount?: number
      }
    ) => {
      if (!aiService.isInitialized()) {
        throw new Error('Claude API not configured')
      }

      const count = options.tweetCount || 7
      const style = options.style || 'professional'

      const systemPrompt = `You are a Twitter/X thread writer. Based on the transcription below, create a thread of ${count} tweets.

Rules:
- Each tweet MUST be under 280 characters
- Return tweets separated by ---TWEET_BREAK---
- Use a ${style} tone
- Do NOT include tweet numbers like "1/" or "Thread:"
- Extract the most important and interesting points from the transcription
- First tweet should hook the reader, last should summarize or call to action

SOURCE: ${options.source}
TRANSCRIPTION:
${options.transcription.slice(0, 80000)}`

      const win = BrowserWindow.fromWebContents(event.sender)

      const tweetContents = await aiService.generateThread(
        options.prompt,
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
        ).run(threadId, options.prompt.slice(0, 100), options.prompt, style)

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

  ipcMain.handle('sources:load-archives', () => {
    const dir = getArchivesDir()
    const count = archiveService.loadArchives(dir)
    return { loaded: true, tweetCount: count }
  })

  ipcMain.handle('sources:search-archive', (_event, query: string, limit?: number) => {
    return archiveService.searchTweets(query, limit)
  })

  ipcMain.handle('sources:archive-status', () => {
    return {
      loaded: archiveService.isLoaded(),
      tweetCount: archiveService.getTweetCount()
    }
  })

  ipcMain.handle(
    'sources:generate-from-document',
    async (
      event,
      options: {
        filePaths: string[]
        prompt: string
        style?: string
        tweetCount?: number
      }
    ) => {
      if (!aiService.isInitialized()) {
        throw new Error('Claude API not configured')
      }

      let sourceContent = ''
      for (const filePath of options.filePaths) {
        const doc = documentService.extractText(filePath)
        sourceContent += `\n--- SOURCE: ${doc.fileName} (${doc.type}) ---\n${doc.text}\n`
      }

      const count = options.tweetCount || 7
      const style = options.style || 'professional'

      const systemPrompt = `You are a Twitter/X thread writer. Based on the source document(s) below, create a thread of ${count} tweets.

Rules:
- Each tweet MUST be under 280 characters
- Return tweets separated by ---TWEET_BREAK---
- Use a ${style} tone
- Do NOT include tweet numbers like "1/" or "Thread:"
- Reference specific facts, quotes, and details from the source material
- First tweet should hook the reader, last should summarize or call to action

SOURCE DOCUMENTS:
${sourceContent.slice(0, 80000)}`

      const win = BrowserWindow.fromWebContents(event.sender)

      const tweetContents = await aiService.generateThread(
        options.prompt,
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
        ).run(threadId, options.prompt.slice(0, 100), options.prompt, style)

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
    'sources:generate-from-archive',
    async (
      event,
      options: {
        query: string
        style?: string
        tweetCount?: number
      }
    ) => {
      if (!aiService.isInitialized()) {
        throw new Error('Claude API not configured')
      }

      if (!archiveService.isLoaded()) {
        archiveService.loadArchives(getArchivesDir())
      }

      const matchingTweets = archiveService.searchTweets(options.query, 200)
      if (matchingTweets.length === 0) {
        throw new Error(`No tweets found matching "${options.query}"`)
      }

      const tweetSummary = matchingTweets
        .map((t) => `[${t.created_at}] ${t.text}`)
        .join('\n\n')

      const count = options.tweetCount || 7
      const style = options.style || 'professional'

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
${tweetSummary.slice(0, 80000)}`

      const win = BrowserWindow.fromWebContents(event.sender)

      const tweetContents = await aiService.generateThread(
        `Create a thread about: ${options.query}`,
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
        ).run(threadId, `Archive: ${options.query.slice(0, 80)}`, options.query, style)

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
