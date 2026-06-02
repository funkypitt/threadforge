import { Sidebar } from '@/components/layout/Sidebar'
import { TitleBar } from '@/components/layout/TitleBar'
import { ThreadEditor } from '@/components/editor/ThreadEditor'
import { AIPanel } from '@/components/ai/AIPanel'
import { SettingsView } from '@/components/settings/SettingsView'
import { PostingDialog } from '@/components/posting/PostingDialog'
import { ScheduleModal } from '@/components/schedule/ScheduleModal'
import { useUIStore } from '@/stores/uiStore'

export default function App(): JSX.Element {
  const activeView = useUIStore((s) => s.activeView)

  return (
    <div className="h-screen flex flex-col">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 overflow-hidden">
          {activeView === 'settings' ? (
            <SettingsView />
          ) : (
            <>
              <ThreadEditor />
              <AIPanel />
            </>
          )}
        </div>
      </div>
      <PostingDialog />
      <ScheduleModal />
    </div>
  )
}
