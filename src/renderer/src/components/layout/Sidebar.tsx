import { useEffect } from 'react'
import { Plus, Settings, Clock, Send, FileText, Archive } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { useDraftsStore } from '@/stores/draftsStore'
import { useUIStore } from '@/stores/uiStore'
import { useEditorStore } from '@/stores/editorStore'
import { formatDistanceToNow } from 'date-fns'
import type { Thread } from '@/types/thread'

function ThreadItem({ thread, isSelected }: { thread: Thread; isSelected: boolean }): JSX.Element {
  const setSelectedThread = useUIStore((s) => s.setSelectedThread)
  const deleteThread = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await window.api.deleteThread(thread.id)
    useDraftsStore.getState().refresh()
    if (isSelected) {
      useEditorStore.getState().reset()
      useUIStore.getState().setSelectedThread(null)
    }
  }

  return (
    <button
      onClick={() => setSelectedThread(thread.id)}
      onContextMenu={deleteThread}
      className={cn(
        'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group',
        isSelected ? 'bg-bg-tertiary text-text-primary' : 'text-text-secondary hover:bg-bg-hover'
      )}
    >
      <div className="truncate font-medium">{thread.title || 'Untitled thread'}</div>
      <div className="text-xs text-text-muted mt-0.5">
        {formatDistanceToNow(new Date(thread.updated_at), { addSuffix: true })}
      </div>
    </button>
  )
}

function Section({
  title,
  icon,
  threads,
  selectedId
}: {
  title: string
  icon: React.ReactNode
  threads: Thread[]
  selectedId: string | null
}): JSX.Element | null {
  if (threads.length === 0) return null
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
        {icon}
        {title}
      </div>
      <div className="space-y-0.5 mt-1">
        {threads.map((t) => (
          <ThreadItem key={t.id} thread={t} isSelected={t.id === selectedId} />
        ))}
      </div>
    </div>
  )
}

export function Sidebar(): JSX.Element {
  const { drafts, scheduled, posted, refresh } = useDraftsStore()
  const selectedThreadId = useUIStore((s) => s.selectedThreadId)
  const setActiveView = useUIStore((s) => s.setActiveView)
  const createNewThread = useEditorStore((s) => s.createNewThread)
  const setSelectedThread = useUIStore((s) => s.setSelectedThread)

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleNewThread = async () => {
    const id = await createNewThread()
    setSelectedThread(id)
    refresh()
  }

  return (
    <div className="w-60 h-full bg-bg-primary border-r border-border flex flex-col">
      {/* App title / drag region */}
      <div className="h-12 flex items-center px-4 border-b border-border app-drag-region">
        <h1 className="text-sm font-bold text-text-primary tracking-tight">ThreadForge</h1>
      </div>

      {/* New thread button */}
      <div className="p-3">
        <Button className="w-full" onClick={handleNewThread}>
          <Plus size={16} className="mr-1.5" />
          New Thread
        </Button>
      </div>

      {/* Thread lists */}
      <div className="flex-1 overflow-y-auto px-2">
        <Section
          title="Drafts"
          icon={<FileText size={12} />}
          threads={drafts}
          selectedId={selectedThreadId}
        />
        <Section
          title="Scheduled"
          icon={<Clock size={12} />}
          threads={scheduled}
          selectedId={selectedThreadId}
        />
        <Section
          title="Posted"
          icon={<Send size={12} />}
          threads={posted}
          selectedId={selectedThreadId}
        />
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-border space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => setActiveView('settings')}
        >
          <Settings size={14} className="mr-2" />
          Settings
        </Button>
      </div>
    </div>
  )
}
