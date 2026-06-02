import { create } from 'zustand'
import type { Thread } from '../types/thread'

interface DraftsState {
  drafts: Thread[]
  scheduled: Thread[]
  posted: Thread[]
  loading: boolean
  refresh: () => Promise<void>
}

export const useDraftsStore = create<DraftsState>((set) => ({
  drafts: [],
  scheduled: [],
  posted: [],
  loading: false,

  refresh: async () => {
    set({ loading: true })
    try {
      const all = await window.api.getThreads()
      set({
        drafts: all.filter((t: Thread) => t.status === 'draft' || t.status === 'failed'),
        scheduled: all.filter((t: Thread) => t.status === 'scheduled'),
        posted: all.filter((t: Thread) => t.status === 'posted'),
        loading: false
      })
    } catch {
      set({ loading: false })
    }
  }
}))
