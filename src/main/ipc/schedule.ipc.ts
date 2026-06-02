import { ipcMain } from 'electron'
import { getDb } from '../db/connection'
import { schedulerService } from '../services/scheduler.service'

export function registerScheduleIpc(): void {
  ipcMain.handle('schedule:set', (_event, threadId: string, scheduledAt: string) => {
    schedulerService.scheduleThread(threadId, new Date(scheduledAt))
  })

  ipcMain.handle('schedule:cancel', (_event, threadId: string) => {
    schedulerService.cancelSchedule(threadId)
  })

  ipcMain.handle('schedule:list', () => {
    const db = getDb()
    const threads = db
      .prepare(
        "SELECT * FROM threads WHERE status = 'scheduled' AND scheduled_at IS NOT NULL ORDER BY scheduled_at ASC"
      )
      .all()

    return (threads as any[]).map((thread) => {
      const tweets = db
        .prepare('SELECT * FROM tweets WHERE thread_id = ? ORDER BY position')
        .all(thread.id)
      return { ...thread, tweets }
    })
  })
}
