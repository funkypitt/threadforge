import { ipcMain } from 'electron'
import { getDb } from '../db/connection'
import {
  setSecureSetting,
  getSecureSetting,
  setSetting,
  getSetting
} from '../services/crypto.service'
import { twitterService } from '../services/twitter.service'
import { aiService } from '../services/ai.service'

const SECURE_KEYS = new Set([
  'x_app_key',
  'x_app_secret',
  'x_access_token',
  'x_access_secret',
  'anthropic_api_key'
])

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get-all', () => {
    const db = getDb()
    const rows = db.prepare('SELECT key, value, encrypted FROM settings').all() as Array<{
      key: string
      value: string
      encrypted: number
    }>

    const result: Record<string, unknown> = {}
    for (const row of rows) {
      if (SECURE_KEYS.has(row.key)) {
        const val = getSecureSetting(row.key)
        result[row.key] = val ? '••••••••' : null
      } else {
        result[row.key] = JSON.parse(row.value)
      }
    }
    return result
  })

  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    if (SECURE_KEYS.has(key)) {
      setSecureSetting(key, value as string)
    } else {
      setSetting(key, value)
    }

    if (key.startsWith('x_')) {
      initializeTwitter()
    }
    if (key === 'anthropic_api_key') {
      initializeAI()
    }
  })

  ipcMain.handle('settings:is-setup-complete', () => {
    return getSetting('setup_complete') === true
  })

  ipcMain.handle('settings:complete-setup', () => {
    setSetting('setup_complete', true)
  })

  ipcMain.handle('settings:test-x-connection', async () => {
    try {
      if (!twitterService.isInitialized()) {
        initializeTwitter()
      }
      const result = await twitterService.verifyCredentials()
      return { success: true, username: result.username }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }
    }
  })

  ipcMain.handle('settings:test-ai-connection', async () => {
    try {
      if (!aiService.isInitialized()) {
        initializeAI()
      }
      const result = await aiService.testConnection()
      return { success: true, model: result.model }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }
    }
  })
}

export function initializeTwitter(): void {
  const appKey = getSecureSetting('x_app_key')
  const appSecret = getSecureSetting('x_app_secret')
  const accessToken = getSecureSetting('x_access_token')
  const accessSecret = getSecureSetting('x_access_secret')

  if (appKey && appSecret && accessToken && accessSecret) {
    twitterService.initialize({ appKey, appSecret, accessToken, accessSecret })
  }
}

export function initializeAI(): void {
  const apiKey = getSecureSetting('anthropic_api_key')
  aiService.initialize(apiKey || undefined)
}
