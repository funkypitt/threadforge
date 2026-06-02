import { Minus, Square, X } from 'lucide-react'

export function TitleBar(): JSX.Element | null {
  if (window.api.platform === 'darwin') return null

  return (
    <div className="h-8 bg-bg-primary border-b border-border flex items-center justify-end px-2 app-drag-region">
      <div className="flex no-drag">
        <button
          onClick={() => window.api.windowControls.minimize()}
          className="h-8 w-10 flex items-center justify-center hover:bg-bg-hover text-text-muted hover:text-text-primary"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={() => window.api.windowControls.maximize()}
          className="h-8 w-10 flex items-center justify-center hover:bg-bg-hover text-text-muted hover:text-text-primary"
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => window.api.windowControls.close()}
          className="h-8 w-10 flex items-center justify-center hover:bg-red-600 text-text-muted hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
