import { app, BrowserWindow, shell, protocol, net, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { getDb, closeDb } from './db/connection'
import { runMigrations } from './db/migrate'
import { registerAllIpc } from './ipc'
import { initializeTwitter, initializeAI } from './ipc/settings.ipc'
import { schedulerService } from './services/scheduler.service'

let mainWindow: BrowserWindow | null = null

function getMigrationsDir(): string {
  if (is.dev) {
    return join(__dirname, '../../src/main/db/migrations')
  }
  return join(process.resourcesPath, 'migrations')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    frame: process.platform === 'darwin' ? true : false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  schedulerService.setWindow(mainWindow)

  ipcMain.handle('window:minimize', () => mainWindow?.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize()
    else mainWindow?.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow?.close())
  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:open-external', (_e, url: string) => shell.openExternal(url))
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'threadforge-media',
    privileges: { bypassCSP: true, stream: true, supportFetchAPI: true }
  }
])

app.whenReady().then(() => {
  protocol.handle('threadforge-media', (request) => {
    const filePath = decodeURIComponent(request.url.replace('threadforge-media://', ''))
    return net.fetch(`file://${filePath}`)
  })

  const db = getDb()
  runMigrations(db, getMigrationsDir())

  registerAllIpc()

  initializeTwitter()
  initializeAI()

  createWindow()

  schedulerService.restoreSchedules()
})

app.on('window-all-closed', () => {
  closeDb()
  app.quit()
})

app.on('before-quit', () => {
  closeDb()
})
