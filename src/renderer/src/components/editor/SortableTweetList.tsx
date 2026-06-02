import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  DragOverlay
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { SortableTweetCard } from './SortableTweetCard'
import { TweetCard } from './TweetCard'
import { useEditorStore } from '@/stores/editorStore'
import type { TweetWithMedia } from '@/types/thread'

export function SortableTweetList(): JSX.Element {
  const tweets = useEditorStore((s) => s.tweets)
  const reorderTweets = useEditorStore((s) => s.reorderTweets)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = tweets.findIndex((t) => t.id === active.id)
      const newIndex = tweets.findIndex((t) => t.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = [...tweets]
      const [moved] = reordered.splice(oldIndex, 1)
      reordered.splice(newIndex, 0, moved)
      reorderTweets(reordered.map((t) => t.id))
    },
    [tweets, reorderTweets]
  )

  const activeTweet = activeId ? tweets.find((t) => t.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={tweets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tweets.map((tweet, i) => (
          <SortableTweetCard
            key={tweet.id}
            tweet={tweet}
            index={i}
            totalTweets={tweets.length}
            isLast={i === tweets.length - 1}
          />
        ))}
      </SortableContext>

      <DragOverlay>
        {activeTweet ? (
          <div className="opacity-80">
            <TweetCard
              tweet={activeTweet}
              index={tweets.indexOf(activeTweet)}
              totalTweets={tweets.length}
              isLast={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
