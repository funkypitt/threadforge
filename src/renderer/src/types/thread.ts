export interface Thread {
  id: string
  title: string
  status: 'draft' | 'scheduled' | 'posting' | 'posted' | 'failed'
  scheduled_at: string | null
  posted_at: string | null
  first_tweet_id: string | null
  error_message: string | null
  ai_prompt: string | null
  ai_style: string | null
  created_at: string
  updated_at: string
}

export interface Tweet {
  id: string
  thread_id: string
  position: number
  content: string
  x_tweet_id: string | null
  posted_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface MediaAttachment {
  id: string
  tweet_id: string
  file_path: string
  file_name: string
  mime_type: string
  file_size: number
  width: number | null
  height: number | null
  position: number
  x_media_id: string | null
  created_at: string
}

export interface TweetWithMedia extends Tweet {
  media: MediaAttachment[]
}

export interface ThreadWithTweets extends Thread {
  tweets: TweetWithMedia[]
}

export interface PostingProgressEvent {
  threadId: string
  phase: 'uploading_media' | 'posting_tweet' | 'complete' | 'error'
  currentTweet: number
  totalTweets: number
  mediaProgress?: number
  error?: string
}

export interface AIStreamEvent {
  type: 'chunk' | 'tweet_complete' | 'done' | 'error'
  content?: string
  tweetIndex?: number
  error?: string
}
