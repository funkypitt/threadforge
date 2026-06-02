import { TwitterApi } from 'twitter-api-v2'

export interface XCredentials {
  appKey: string
  appSecret: string
  accessToken: string
  accessSecret: string
}

export interface PostingProgress {
  threadId: string
  phase: 'uploading_media' | 'posting_tweet' | 'complete' | 'error'
  currentTweet: number
  totalTweets: number
  mediaProgress?: number
  error?: string
}

export class TwitterService {
  private client: TwitterApi | null = null

  initialize(credentials: XCredentials): void {
    this.client = new TwitterApi({
      appKey: credentials.appKey,
      appSecret: credentials.appSecret,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessSecret
    })
  }

  isInitialized(): boolean {
    return this.client !== null
  }

  async verifyCredentials(): Promise<{ username: string; name: string }> {
    if (!this.client) throw new Error('Twitter client not initialized')
    const me = await this.client.v2.me()
    return { username: me.data.username, name: me.data.name }
  }

  async postThread(
    tweets: Array<{ content: string; mediaFilePaths: string[] }>,
    onProgress: (event: Omit<PostingProgress, 'threadId'>) => void
  ): Promise<string[]> {
    if (!this.client) throw new Error('Twitter client not initialized')

    const tweetIds: string[] = []
    let previousTweetId: string | undefined

    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i]

      const mediaIds: string[] = []
      for (const filePath of tweet.mediaFilePaths) {
        onProgress({
          phase: 'uploading_media',
          currentTweet: i + 1,
          totalTweets: tweets.length,
          mediaProgress: 0
        })
        const mediaId = await this.client.v1.uploadMedia(filePath)
        mediaIds.push(mediaId)
      }

      onProgress({
        phase: 'posting_tweet',
        currentTweet: i + 1,
        totalTweets: tweets.length
      })

      const result = await this.client.v2.tweet({
        text: tweet.content,
        ...(mediaIds.length > 0 && { media: { media_ids: mediaIds as [string] } }),
        ...(previousTweetId && { reply: { in_reply_to_tweet_id: previousTweetId } })
      })

      previousTweetId = result.data.id
      tweetIds.push(result.data.id)
    }

    return tweetIds
  }
}

export const twitterService = new TwitterService()
