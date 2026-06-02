import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getThreads: (filter?: { status?: string }) => ipcRenderer.invoke('threads:list', filter),
  getThread: (id: string) => ipcRenderer.invoke('threads:get', id),
  createThread: (data?: { title?: string }) => ipcRenderer.invoke('threads:create', data),
  updateThread: (id: string, data: Record<string, unknown>) =>
    ipcRenderer.invoke('threads:update', id, data),
  deleteThread: (id: string) => ipcRenderer.invoke('threads:delete', id),

  addTweet: (threadId: string, position?: number) =>
    ipcRenderer.invoke('tweets:add', threadId, position),
  updateTweet: (id: string, data: { content?: string; position?: number }) =>
    ipcRenderer.invoke('tweets:update', id, data),
  deleteTweet: (id: string) => ipcRenderer.invoke('tweets:delete', id),
  reorderTweets: (threadId: string, orderedIds: string[]) =>
    ipcRenderer.invoke('tweets:reorder', threadId, orderedIds),

  attachMedia: (tweetId: string, filePaths: string[]) =>
    ipcRenderer.invoke('media:attach', tweetId, filePaths),
  removeMedia: (mediaId: string) => ipcRenderer.invoke('media:remove', mediaId),
  selectMediaFiles: () => ipcRenderer.invoke('media:select-dialog'),

  postThread: (threadId: string) => ipcRenderer.invoke('posting:start', threadId),
  onPostingProgress: (callback: (_event: unknown, data: unknown) => void) => {
    ipcRenderer.on('posting:progress', callback)
    return () => ipcRenderer.removeListener('posting:progress', callback)
  },

  scheduleThread: (threadId: string, scheduledAt: string) =>
    ipcRenderer.invoke('schedule:set', threadId, scheduledAt),
  cancelSchedule: (threadId: string) => ipcRenderer.invoke('schedule:cancel', threadId),
  getScheduledThreads: () => ipcRenderer.invoke('schedule:list'),

  generateThread: (
    prompt: string,
    options?: { style?: string; tweetCount?: number; systemPrompt?: string }
  ) => ipcRenderer.invoke('ai:generate-thread', prompt, options),
  regenerateTweet: (tweetId: string, context: { threadContent: string[]; tweetIndex: number }) =>
    ipcRenderer.invoke('ai:regenerate-tweet', tweetId, context),
  onAIStream: (callback: (_event: unknown, data: unknown) => void) => {
    ipcRenderer.on('ai:stream', callback)
    return () => ipcRenderer.removeListener('ai:stream', callback)
  },

  getSettings: () => ipcRenderer.invoke('settings:get-all'),
  setSetting: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
  isSetupComplete: () => ipcRenderer.invoke('settings:is-setup-complete'),
  completeSetup: () => ipcRenderer.invoke('settings:complete-setup'),
  testXConnection: () => ipcRenderer.invoke('settings:test-x-connection'),
  testAIConnection: () => ipcRenderer.invoke('settings:test-ai-connection'),

  // Sources (documents + archives)
  selectSourceFiles: () => ipcRenderer.invoke('sources:select-files'),
  extractDocumentText: (filePath: string) => ipcRenderer.invoke('sources:extract-text', filePath),
  loadArchives: () => ipcRenderer.invoke('sources:load-archives'),
  searchArchive: (query: string, limit?: number) =>
    ipcRenderer.invoke('sources:search-archive', query, limit),
  getArchiveStatus: () => ipcRenderer.invoke('sources:archive-status'),
  generateFromDocument: (options: {
    filePaths: string[]
    prompt: string
    style?: string
    tweetCount?: number
  }) => ipcRenderer.invoke('sources:generate-from-document', options),
  generateFromArchive: (options: { query: string; style?: string; tweetCount?: number }) =>
    ipcRenderer.invoke('sources:generate-from-archive', options),
  selectMediaSourceFiles: () => ipcRenderer.invoke('sources:select-media-files'),
  transcribeFile: (filePath: string) => ipcRenderer.invoke('sources:transcribe-file', filePath),
  transcribeYouTube: (url: string) => ipcRenderer.invoke('sources:transcribe-youtube', url),
  generateFromTranscription: (options: {
    transcription: string
    source: string
    prompt: string
    style?: string
    tweetCount?: number
  }) => ipcRenderer.invoke('sources:generate-from-transcription', options),

  getAppVersion: () => ipcRenderer.invoke('app:version'),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),

  platform: process.platform,
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close')
  }
}

contextBridge.exposeInMainWorld('api', api)
