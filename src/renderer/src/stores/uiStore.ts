import { create } from 'zustand'

type View = 'editor' | 'schedule-queue' | 'settings'

interface UIState {
  activeView: View
  sidebarCollapsed: boolean
  aiPanelOpen: boolean
  selectedThreadId: string | null
  postingDialogThreadId: string | null
  scheduleModalThreadId: string | null

  setActiveView: (view: View) => void
  toggleSidebar: () => void
  toggleAIPanel: () => void
  setSelectedThread: (id: string | null) => void
  openPostingDialog: (threadId: string) => void
  closePostingDialog: () => void
  openScheduleModal: (threadId: string) => void
  closeScheduleModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  activeView: 'editor',
  sidebarCollapsed: false,
  aiPanelOpen: false,
  selectedThreadId: null,
  postingDialogThreadId: null,
  scheduleModalThreadId: null,

  setActiveView: (view) => set({ activeView: view }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleAIPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),
  setSelectedThread: (id) => set({ selectedThreadId: id, activeView: 'editor' }),
  openPostingDialog: (threadId) => set({ postingDialogThreadId: threadId }),
  closePostingDialog: () => set({ postingDialogThreadId: null }),
  openScheduleModal: (threadId) => set({ scheduleModalThreadId: threadId }),
  closeScheduleModal: () => set({ scheduleModalThreadId: null })
}))
