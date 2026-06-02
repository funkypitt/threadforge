export interface Thread {
  id: string
  title: string
  status: 'draft' | 'scheduled' | 'posting' | 'posted' | 'failed'
  scheduled_at: string | null
  posted_at: string | null
  first_tweet_id: string | null
  error_message: string | null
  ai_prompt: string | null
  ai_style: string | null
  created_at: string
  updated_at: string
}

export interface Tweet {
  id: string
  thread_id: string
  position: number
  content: string
  x_tweet_id: string | null
  posted_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface MediaAttachment {
  id: string
  tweet_id: string
  file_path: string
  file_name: string
  mime_type: string
  file_size: number
  width: number | null
  height: number | null
  position: number
  x_media_id: string | null
  created_at: string
}

export interface TweetWithMedia extends Tweet {
  media: MediaAttachment[]
}

export interface ThreadWithTweets extends Thread {
  tweets: TweetWithMedia[]
}

export interface PostingProgressEvent {
  threadId: string
  phase: 'uploading_media' | 'posting_tweet' | 'complete' | 'error'
  currentTweet: number
  totalTweets: number
  mediaProgress?: number
  error?: string
}

export interface AIStreamEvent {
  type: 'chunk' | 'tweet_complete' | 'done' | 'error'
  content?: string
  tweetIndex?: number
  error?: string
}

export interface ThreadForgeAPI {
  getThreads: (filter?: { status?: string }) => Promise<Thread[]>
  getThread: (id: string) => Promise<ThreadWithTweets | null>
  createThread: (data?: { title?: string }) => Promise<Thread>
  updateThread: (id: string, data: Record<string, unknown>) => Promise<Thread>
  deleteThread: (id: string) => Promise<void>
  addTweet: (threadId: string, position?: number) => Promise<Tweet>
  updateTweet: (id: string, data: { content?: string; position?: number }) => Promise<Tweet>
  deleteTweet: (id: string) => Promise<void>
  reorderTweets: (threadId: string, orderedIds: string[]) => Promise<void>
  attachMedia: (tweetId: string, filePaths: string[]) => Promise<MediaAttachment[]>
  removeMedia: (mediaId: string) => Promise<void>
  selectMediaFiles: () => Promise<string[]>
  postThread: (threadId: string) => Promise<string[]>
  onPostingProgress: (
    callback: (event: unknown, data: PostingProgressEvent) => void
  ) => () => void
  scheduleThread: (threadId: string, scheduledAt: string) => Promise<void>
  cancelSchedule: (threadId: string) => Promise<void>
  getScheduledThreads: () => Promise<ThreadWithTweets[]>
  generateThread: (
    prompt: string,
    options?: { style?: string; tweetCount?: number; systemPrompt?: string }
  ) => Promise<ThreadWithTweets>
  regenerateTweet: (
    tweetId: string,
    context: { threadContent: string[]; tweetIndex: number }
  ) => Promise<Tweet>
  onAIStream: (callback: (event: unknown, data: AIStreamEvent) => void) => () => void
  getSettings: () => Promise<Record<string, unknown>>
  setSetting: (key: string, value: unknown) => Promise<void>
  testXConnection: () => Promise<{ success: boolean; username?: string; error?: string }>
  testAIConnection: () => Promise<{ success: boolean; model?: string; error?: string }>
  getAppVersion: () => Promise<string>
  openExternal: (url: string) => Promise<void>
  platform: string
  windowControls: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
  }
}

declare global {
  interface Window {
    api: ThreadForgeAPI
  }
}
