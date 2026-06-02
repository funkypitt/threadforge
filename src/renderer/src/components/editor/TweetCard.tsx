import { useCallback } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { useDebouncedCallback } from 'use-debounce'
import { GripVertical, Trash2, Image, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CharacterCounter } from './CharacterCounter'
import { MediaPreview } from './MediaPreview'
import { useEditorStore } from '@/stores/editorStore'
import type { TweetWithMedia } from '@/types/thread'

interface TweetCardProps {
  tweet: TweetWithMedia
  index: number
  totalTweets: number
  isLast: boolean
  dragHandleProps?: Record<string, unknown>
}

export function TweetCard({
  tweet,
  index,
  totalTweets,
  isLast,
  dragHandleProps
}: TweetCardProps): JSX.Element {
  const updateTweetContent = useEditorStore((s) => s.updateTweetContent)
  const removeTweet = useEditorStore((s) => s.removeTweet)
  const addTweet = useEditorStore((s) => s.addTweet)
  const addMedia = useEditorStore((s) => s.addMedia)
  const removeMedia = useEditorStore((s) => s.removeMedia)

  const saveContent = useDebouncedCallback((content: string) => {
    window.api.updateTweet(tweet.id, { content })
  }, 500)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const content = e.target.value
      updateTweetContent(tweet.id, content)
      saveContent(content)
    },
    [tweet.id, updateTweetContent, saveContent]
  )

  return (
    <div className="group relative">
      <div className="flex gap-3">
        {/* Thread connector line */}
        <div className="flex flex-col items-center w-8 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-medium text-white">
            {index + 1}
          </div>
          {!isLast && <div className="w-0.5 flex-1 bg-border mt-1" />}
        </div>

        {/* Tweet content */}
        <div className="flex-1 bg-bg-secondary rounded-xl p-4 border border-border hover:border-border-hover transition-colors mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {totalTweets > 1 && (
                <button
                  className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary"
                  {...dragHandleProps}
                >
                  <GripVertical size={16} />
                </button>
              )}
              <span className="text-xs text-text-muted">
                Tweet {index + 1} of {totalTweets}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CharacterCounter count={tweet.content.length} />
              {totalTweets > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => removeTweet(tweet.id)}
                >
                  <Trash2 size={14} className="text-text-muted hover:text-danger" />
                </Button>
              )}
            </div>
          </div>

          <TextareaAutosize
            value={tweet.content}
            onChange={handleChange}
            placeholder="What's happening?"
            className="w-full bg-transparent text-text-primary resize-none outline-none text-[15px] leading-relaxed placeholder:text-text-muted"
            minRows={2}
            maxRows={12}
          />

          {/* Media attachments */}
          {tweet.media.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {tweet.media.map((m) => (
                <MediaPreview
                  key={m.id}
                  media={m}
                  onRemove={() => removeMedia(m.id, tweet.id)}
                />
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/50">
            <Button variant="ghost" size="sm" onClick={() => addMedia(tweet.id)}>
              <Image size={14} className="mr-1" />
              Media
            </Button>
            <Button variant="ghost" size="sm" onClick={() => addTweet(index)}>
              <span className="text-xs">+ Add below</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
