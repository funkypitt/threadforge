import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TweetCard } from './TweetCard'
import type { TweetWithMedia } from '@/types/thread'

interface SortableTweetCardProps {
  tweet: TweetWithMedia
  index: number
  totalTweets: number
  isLast: boolean
}

export function SortableTweetCard({
  tweet,
  index,
  totalTweets,
  isLast
}: SortableTweetCardProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tweet.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 50 : 'auto' as const
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TweetCard
        tweet={tweet}
        index={index}
        totalTweets={totalTweets}
        isLast={isLast}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
