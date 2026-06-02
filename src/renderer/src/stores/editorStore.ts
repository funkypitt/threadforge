import { create } from 'zustand'
import type { TweetWithMedia, ThreadWithTweets } from '../types/thread'

interface EditorState {
  threadId: string | null
  title: string
  tweets: TweetWithMedia[]
  status: 'draft' | 'scheduled' | 'posting' | 'posted' | 'failed'
  scheduledAt: string | null
  aiPrompt: string | null
  aiStyle: string | null

  loadThread: (threadId: string) => Promise<void>
  createNewThread: () => Promise<string>
  setTitle: (title: string) => void
  updateTweetContent: (tweetId: string, content: string) => void
  addTweet: (afterPosition?: number) => Promise<void>
  removeTweet: (tweetId: string) => Promise<void>
  reorderTweets: (orderedIds: string[]) => void
  addMedia: (tweetId: string) => Promise<void>
  removeMedia: (mediaId: string, tweetId: string) => Promise<void>
  replaceAllTweets: (thread: ThreadWithTweets) => void
  replaceTweetContent: (tweetId: string, content: string) => void
  reset: () => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  threadId: null,
  title: '',
  tweets: [],
  status: 'draft',
  scheduledAt: null,
  aiPrompt: null,
  aiStyle: null,

  loadThread: async (threadId: string) => {
    const thread = (await window.api.getThread(threadId)) as ThreadWithTweets | null
    if (!thread) return
    set({
      threadId: thread.id,
      title: thread.title,
      tweets: thread.tweets || [],
      status: thread.status,
      scheduledAt: thread.scheduled_at,
      aiPrompt: thread.ai_prompt,
      aiStyle: thread.ai_style
    })
  },

  createNewThread: async () => {
    const thread = await window.api.createThread()
    const full = (await window.api.getThread(thread.id)) as ThreadWithTweets
    set({
      threadId: full.id,
      title: full.title,
      tweets: full.tweets || [],
      status: 'draft',
      scheduledAt: null,
      aiPrompt: null,
      aiStyle: null
    })
    return full.id
  },

  setTitle: (title: string) => {
    set({ title })
    const { threadId } = get()
    if (threadId) {
      window.api.updateThread(threadId, { title })
    }
  },

  updateTweetContent: (tweetId: string, content: string) => {
    set((s) => ({
      tweets: s.tweets.map((t) => (t.id === tweetId ? { ...t, content } : t))
    }))
  },

  addTweet: async (afterPosition?: number) => {
    const { threadId } = get()
    if (!threadId) return
    const pos = afterPosition !== undefined ? afterPosition + 1 : undefined
    await window.api.addTweet(threadId, pos)
    await get().loadThread(threadId)
  },

  removeTweet: async (tweetId: string) => {
    const { threadId, tweets } = get()
    if (!threadId || tweets.length <= 1) return
    await window.api.deleteTweet(tweetId)
    await get().loadThread(threadId)
  },

  reorderTweets: (orderedIds: string[]) => {
    const { threadId, tweets } = get()
    if (!threadId) return
    const reordered = orderedIds
      .map((id) => tweets.find((t) => t.id === id))
      .filter(Boolean) as TweetWithMedia[]
    set({ tweets: reordered.map((t, i) => ({ ...t, position: i })) })
    window.api.reorderTweets(threadId, orderedIds)
  },

  addMedia: async (tweetId: string) => {
    const { threadId } = get()
    if (!threadId) return
    const filePaths = await window.api.selectMediaFiles()
    if (filePaths.length === 0) return
    await window.api.attachMedia(tweetId, filePaths)
    await get().loadThread(threadId)
  },

  removeMedia: async (mediaId: string, _tweetId: string) => {
    const { threadId } = get()
    if (!threadId) return
    await window.api.removeMedia(mediaId)
    await get().loadThread(threadId)
  },

  replaceAllTweets: (thread: ThreadWithTweets) => {
    set({
      threadId: thread.id,
      title: thread.title,
      tweets: thread.tweets || [],
      status: thread.status,
      aiPrompt: thread.ai_prompt,
      aiStyle: thread.ai_style
    })
  },

  replaceTweetContent: (tweetId: string, content: string) => {
    set((s) => ({
      tweets: s.tweets.map((t) => (t.id === tweetId ? { ...t, content } : t))
    }))
  },

  reset: () => {
    set({
      threadId: null,
      title: '',
      tweets: [],
      status: 'draft',
      scheduledAt: null,
      aiPrompt: null,
      aiStyle: null
    })
  }
}))
