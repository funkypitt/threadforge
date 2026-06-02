import { useEffect } from 'react'
import { Plus, Send, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SortableTweetList } from './SortableTweetList'
import { useEditorStore } from '@/stores/editorStore'
import { useUIStore } from '@/stores/uiStore'

export function ThreadEditor(): JSX.Element {
  const {
    threadId,
    title,
    tweets,
    status,
    setTitle,
    addTweet,
    loadThread
  } = useEditorStore()
  const selectedThreadId = useUIStore((s) => s.selectedThreadId)
  const toggleAIPanel = useUIStore((s) => s.toggleAIPanel)
  const openPostingDialog = useUIStore((s) => s.openPostingDialog)
  const openScheduleModal = useUIStore((s) => s.openScheduleModal)

  useEffect(() => {
    if (selectedThreadId) {
      loadThread(selectedThreadId)
    }
  }, [selectedThreadId, loadThread])

  if (!threadId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-text-secondary mb-2">No thread selected</h2>
          <p className="text-text-muted mb-4">Create a new thread or select one from the sidebar</p>
        </div>
      </div>
    )
  }

  const canPost = status === 'draft' && tweets.some((t) => t.content.trim().length > 0)

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Thread title (optional)"
          className="bg-transparent text-lg font-medium text-text-primary outline-none placeholder:text-text-muted flex-1 mr-4"
        />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleAIPanel}>
            <Sparkles size={16} className="mr-1.5" />
            AI
          </Button>
          {canPost && (
            <>
              <Button variant="outline" size="sm" onClick={() => openScheduleModal(threadId)}>
                <Clock size={14} className="mr-1.5" />
                Schedule
              </Button>
              <Button size="sm" onClick={() => openPostingDialog(threadId)}>
                <Send size={14} className="mr-1.5" />
                Post
              </Button>
            </>
          )}
          {status === 'posted' && (
            <span className="text-xs text-success font-medium px-2 py-1 bg-success/10 rounded">
              Posted
            </span>
          )}
          {status === 'scheduled' && (
            <span className="text-xs text-warning font-medium px-2 py-1 bg-warning/10 rounded">
              Scheduled
            </span>
          )}
          {status === 'failed' && (
            <span className="text-xs text-danger font-medium px-2 py-1 bg-danger/10 rounded">
              Failed
            </span>
          )}
        </div>
      </div>

      {/* Tweet list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <SortableTweetList />

          <div className="flex justify-center mt-4">
            <Button variant="secondary" onClick={() => addTweet()}>
              <Plus size={16} className="mr-1.5" />
              Add Tweet
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
