import { ipcMain, dialog } from 'electron'
import { randomUUID } from 'crypto'
import { copyFileSync, unlinkSync, statSync } from 'fs'
import { join, extname, basename } from 'path'
import { getDb } from '../db/connection'
import { getMediaDir } from '../lib/paths'

const ALLOWED_IMAGE_TYPES = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp'])
const ALLOWED_VIDEO_TYPES = new Set(['.mp4', '.mov'])
const MAX_IMAGES_PER_TWEET = 4

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime'
  }
  return map[ext] || 'application/octet-stream'
}

export function registerMediaIpc(): void {
  ipcMain.handle('media:select-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Media',
          extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov']
        }
      ]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('media:attach', (_event, tweetId: string, filePaths: string[]) => {
    const db = getDb()
    const tweet = db.prepare('SELECT * FROM tweets WHERE id = ?').get(tweetId) as any
    if (!tweet) throw new Error('Tweet not found')

    const existingMedia = db
      .prepare('SELECT * FROM media WHERE tweet_id = ? ORDER BY position')
      .all(tweetId) as any[]

    const results: any[] = []

    for (const filePath of filePaths) {
      const ext = extname(filePath).toLowerCase()
      const isImage = ALLOWED_IMAGE_TYPES.has(ext)
      const isVideo = ALLOWED_VIDEO_TYPES.has(ext)

      if (!isImage && !isVideo) {
        throw new Error(`Unsupported file type: ${ext}`)
      }

      if (isVideo && existingMedia.length > 0) {
        throw new Error('Cannot add video to a tweet that already has media')
      }

      if (isImage && existingMedia.some((m: any) => ALLOWED_VIDEO_TYPES.has(extname(m.file_path).toLowerCase()))) {
        throw new Error('Cannot add images to a tweet that has a video')
      }

      if (isImage && existingMedia.filter((m: any) => ALLOWED_IMAGE_TYPES.has(extname(m.file_path).toLowerCase())).length >= MAX_IMAGES_PER_TWEET) {
        throw new Error('Maximum 4 images per tweet')
      }

      const mediaId = randomUUID()
      const destDir = getMediaDir(tweet.thread_id)
      const destPath = join(destDir, `${mediaId}${ext}`)
      copyFileSync(filePath, destPath)

      const stats = statSync(destPath)
      const position = existingMedia.length + results.length

      db.prepare(
        'INSERT INTO media (id, tweet_id, file_path, file_name, mime_type, file_size, position) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(mediaId, tweetId, destPath, basename(filePath), getMimeType(ext), stats.size, position)

      results.push(
        db.prepare('SELECT * FROM media WHERE id = ?').get(mediaId)
      )
    }

    return results
  })

  ipcMain.handle('media:remove', (_event, mediaId: string) => {
    const db = getDb()
    const media = db.prepare('SELECT * FROM media WHERE id = ?').get(mediaId) as any
    if (!media) return

    try {
      unlinkSync(media.file_path)
    } catch {
      // file may already be gone
    }

    db.prepare('DELETE FROM media WHERE id = ?').run(mediaId)
  })
}
