import { X } from 'lucide-react'
import type { MediaAttachment } from '@/types/thread'

interface MediaPreviewProps {
  media: MediaAttachment
  onRemove: () => void
}

export function MediaPreview({ media, onRemove }: MediaPreviewProps): JSX.Element {
  const isVideo = media.mime_type.startsWith('video/')
  const src = `threadforge-media://${encodeURIComponent(media.file_path)}`

  return (
    <div className="relative group/media rounded-lg overflow-hidden bg-bg-tertiary">
      {isVideo ? (
        <video src={src} className="w-full h-32 object-cover" muted />
      ) : (
        <img src={src} alt={media.file_name} className="w-full h-32 object-cover" />
      )}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 bg-black/70 rounded-full p-1 opacity-0 group-hover/media:opacity-100 transition-opacity"
      >
        <X size={12} className="text-white" />
      </button>
      {isVideo && (
        <div className="absolute bottom-1 left-1 bg-black/70 rounded px-1.5 py-0.5 text-[10px] text-white">
          VIDEO
        </div>
      )}
    </div>
  )
}
