import { useState } from 'react'
import { Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/stores/uiStore'
import { useDraftsStore } from '@/stores/draftsStore'
import { useEditorStore } from '@/stores/editorStore'

export function ScheduleModal(): JSX.Element | null {
  const threadId = useUIStore((s) => s.scheduleModalThreadId)
  const closeScheduleModal = useUIStore((s) => s.closeScheduleModal)
  const refreshDrafts = useDraftsStore((s) => s.refresh)
  const loadThread = useEditorStore((s) => s.loadThread)

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  if (!threadId) return null

  const handleSchedule = async () => {
    if (!date || !time) return
    const scheduledAt = new Date(`${date}T${time}`).toISOString()
    await window.api.scheduleThread(threadId, scheduledAt)
    refreshDrafts()
    loadThread(threadId)
    closeScheduleModal()
  }

  const handleCancelSchedule = async () => {
    await window.api.cancelSchedule(threadId)
    refreshDrafts()
    loadThread(threadId)
    closeScheduleModal()
  }

  const now = new Date()
  const minDate = now.toISOString().split('T')[0]
  const minTime = date === minDate ? now.toTimeString().slice(0, 5) : '00:00'

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => closeScheduleModal()}>
      <div
        className="bg-bg-secondary border border-border rounded-2xl p-6 w-96 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-accent" />
            <h2 className="text-lg font-semibold">Schedule Thread</h2>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => closeScheduleModal()}>
            <X size={14} />
          </Button>
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <label className="text-xs text-text-muted block mb-1">Date</label>
            <input
              type="date"
              value={date}
              min={minDate}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1">Time</label>
            <input
              type="time"
              value={time}
              min={minTime}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => closeScheduleModal()}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!date || !time} onClick={handleSchedule}>
            Schedule
          </Button>
        </div>
      </div>
    </div>
  )
}
