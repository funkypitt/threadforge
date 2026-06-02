import { useState, useEffect } from 'react'
import { Loader2, Check, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/stores/uiStore'
import { useDraftsStore } from '@/stores/draftsStore'
import { useEditorStore } from '@/stores/editorStore'
import type { PostingProgressEvent } from '@/types/thread'

export function PostingDialog(): JSX.Element | null {
  const threadId = useUIStore((s) => s.postingDialogThreadId)
  const closePostingDialog = useUIStore((s) => s.closePostingDialog)
  const refreshDrafts = useDraftsStore((s) => s.refresh)
  const loadThread = useEditorStore((s) => s.loadThread)

  const [status, setStatus] = useState<'idle' | 'posting' | 'complete' | 'error'>('idle')
  const [progress, setProgress] = useState<PostingProgressEvent | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!threadId) return

    const cleanup = window.api.onPostingProgress((_ev, data) => {
      const event = data as PostingProgressEvent
      if (event.threadId !== threadId) return
      setProgress(event)
      if (event.phase === 'complete') setStatus('complete')
      if (event.phase === 'error') {
        setStatus('error')
        setError(event.error || 'Unknown error')
      }
    })

    return cleanup
  }, [threadId])

  if (!threadId) return null

  const handlePost = async () => {
    setStatus('posting')
    setError(null)
    try {
      await window.api.postThread(threadId)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Posting failed')
    }
  }

  const handleClose = () => {
    if (status === 'complete') {
      refreshDrafts()
      loadThread(threadId)
    }
    setStatus('idle')
    setProgress(null)
    setError(null)
    closePostingDialog()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={handleClose}>
      <div
        className="bg-bg-secondary border border-border rounded-2xl p-6 w-96 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Post Thread</h2>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClose}>
            <X size={14} />
          </Button>
        </div>

        {status === 'idle' && (
          <>
            <p className="text-sm text-text-secondary mb-4">
              Ready to post your thread to X?
            </p>
            <Button className="w-full" onClick={handlePost}>
              Post Now
            </Button>
          </>
        )}

        {status === 'posting' && progress && (
          <div className="text-center py-4">
            <Loader2 size={32} className="animate-spin text-accent mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              {progress.phase === 'uploading_media' && `Uploading media for tweet ${progress.currentTweet}/${progress.totalTweets}...`}
              {progress.phase === 'posting_tweet' && `Posting tweet ${progress.currentTweet}/${progress.totalTweets}...`}
            </p>
            <div className="w-full bg-bg-tertiary rounded-full h-2 mt-3">
              <div
                className="bg-accent rounded-full h-2 transition-all"
                style={{ width: `${(progress.currentTweet / progress.totalTweets) * 100}%` }}
              />
            </div>
          </div>
        )}

        {status === 'complete' && (
          <div className="text-center py-4">
            <Check size={32} className="text-success mx-auto mb-3" />
            <p className="text-sm text-text-secondary mb-4">Thread posted successfully!</p>
            <Button variant="secondary" className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-4">
            <AlertCircle size={32} className="text-danger mx-auto mb-3" />
            <p className="text-sm text-danger mb-2">Posting failed</p>
            <p className="text-xs text-text-muted mb-4">{error}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={handleClose}>
                Close
              </Button>
              <Button className="flex-1" onClick={handlePost}>
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
