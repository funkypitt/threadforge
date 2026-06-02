import Anthropic from '@anthropic-ai/sdk'

export interface AIStreamEvent {
  type: 'chunk' | 'tweet_complete' | 'done' | 'error'
  content?: string
  tweetIndex?: number
  error?: string
}

export class AIService {
  private client: Anthropic | null = null

  initialize(apiKey?: string): void {
    this.client = new Anthropic(apiKey ? { apiKey } : undefined)
  }

  isInitialized(): boolean {
    return this.client !== null
  }

  async testConnection(): Promise<{ model: string }> {
    if (!this.client) throw new Error('AI client not initialized')
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say "ok"' }]
    })
    return { model: response.model }
  }

  async generateThread(
    prompt: string,
    options: {
      style?: string
      tweetCount?: number
      language?: string
      systemPrompt?: string
    },
    onStream: (event: AIStreamEvent) => void
  ): Promise<string[]> {
    if (!this.client) throw new Error('AI client not initialized')

    const count = options.tweetCount || 7
    const style = options.style || 'professional'
    const language = options.language || 'French'

    const defaultSystem = `You are a Twitter/X thread writer. Generate a thread of ${count} tweets about the given topic.

Rules:
- WRITE ENTIRELY IN ${language.toUpperCase()}
- Each tweet MUST be under 280 characters
- Return tweets separated by ---TWEET_BREAK---
- First tweet should hook the reader
- Last tweet should be a call to action or summary
- Use a ${style} tone
- Do NOT include tweet numbers like "1/" or "Thread:"
- Write compelling, specific content — avoid generic filler`

    const systemPrompt = options.systemPrompt || defaultSystem

    const tweets: string[] = []
    let currentTweet = ''

    const stream = this.client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text
        onStream({ type: 'chunk', content: text })

        currentTweet += text
        if (currentTweet.includes('---TWEET_BREAK---')) {
          const parts = currentTweet.split('---TWEET_BREAK---')
          let tweet = parts[0].trim()
          if (tweet.length > 280) tweet = this.truncateTo280(tweet)
          if (tweet.length > 0) {
            tweets.push(tweet)
            onStream({ type: 'tweet_complete', tweetIndex: tweets.length - 1 })
          }
          currentTweet = parts.slice(1).join('---TWEET_BREAK---')
        }
      }
    }

    if (currentTweet.trim()) {
      let tweet = currentTweet.trim()
      if (tweet.length > 280) tweet = this.truncateTo280(tweet)
      if (tweet.length > 0) {
        tweets.push(tweet)
        onStream({ type: 'tweet_complete', tweetIndex: tweets.length - 1 })
      }
    }

    onStream({ type: 'done' })
    return tweets
  }

  async generateLongThread(
    prompt: string,
    options: {
      style?: string
      tweetCount?: number
      language?: string
      sourceContent?: string
      systemPromptOverride?: string
    },
    onProgress: (event: AIStreamEvent & { totalGenerated?: number }) => void
  ): Promise<string[]> {
    if (!this.client) throw new Error('AI client not initialized')

    const targetCount = options.tweetCount || 100
    const style = options.style || 'professional'
    const language = options.language || 'French'
    const batchSize = 15
    const allTweets: string[] = []

    const sourceSection = options.sourceContent
      ? `\n\nSOURCE MATERIAL:\n${options.sourceContent.slice(0, 60000)}`
      : ''

    while (allTweets.length < targetCount) {
      const remaining = targetCount - allTweets.length
      const thisCount = Math.min(batchSize, remaining)
      const batchIndex = Math.floor(allTweets.length / batchSize)

      const previousSummary = allTweets.length > 0
        ? `\n\nTWEETS ALREADY WRITTEN (${allTweets.length} so far — continue from here, do NOT repeat):\n${allTweets.map((t, i) => `[${i + 1}] ${t}`).join('\n')}`
        : ''

      const systemPrompt = options.systemPromptOverride || `You are a Twitter/X thread writer creating an epic long-form thread.

ABSOLUTE RULES — violations are unacceptable:
- WRITE ENTIRELY IN ${language.toUpperCase()}
- Every single tweet MUST be STRICTLY UNDER 280 characters. Count carefully. This is a hard technical limit.
- Return tweets separated by ---TWEET_BREAK---
- Do NOT include tweet numbers, "Thread:", or any meta-text
- Do NOT repeat or paraphrase any tweet already written

STYLE: ${style}
TARGET: Generate exactly ${thisCount} tweets for this batch (batch ${batchIndex + 1})
TOTAL THREAD TARGET: ${targetCount} tweets

NARRATIVE GUIDELINES:
- Build a chronological narrative arc
- Each tweet should be self-contained but flow into the next
- Include specific dates, names, studies, and events when available
- Vary tweet structure: facts, quotes, rhetorical questions, dramatic statements
- ${batchIndex === 0 ? 'Start with a powerful hook that makes people want to read the whole thread' : 'Continue seamlessly from where the previous batch ended'}
- ${remaining <= batchSize ? 'This is the final batch — end with a powerful conclusion' : 'End this batch at a natural transition point'}${sourceSection}`

      const userMessage = batchIndex === 0
        ? prompt
        : `Continue the thread. ${prompt}${previousSummary}`

      const batchTweets: string[] = []
      let currentTweet = ''

      const stream = this.client.messages.stream({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          currentTweet += event.delta.text

          if (currentTweet.includes('---TWEET_BREAK---')) {
            const parts = currentTweet.split('---TWEET_BREAK---')
            let tweet = parts[0].trim()

            // Hard enforce 280 char limit — truncate at last word boundary
            if (tweet.length > 280) {
              tweet = this.truncateTo280(tweet)
            }

            if (tweet.length > 0) {
              batchTweets.push(tweet)
              allTweets.push(tweet)
              onProgress({
                type: 'tweet_complete',
                tweetIndex: allTweets.length - 1,
                content: tweet,
                totalGenerated: allTweets.length
              })
            }

            currentTweet = parts.slice(1).join('---TWEET_BREAK---')
          }
        }
      }

      // Final tweet in batch
      if (currentTweet.trim()) {
        let tweet = currentTweet.trim()
        if (tweet.length > 280) {
          tweet = this.truncateTo280(tweet)
        }
        if (tweet.length > 0) {
          batchTweets.push(tweet)
          allTweets.push(tweet)
          onProgress({
            type: 'tweet_complete',
            tweetIndex: allTweets.length - 1,
            content: tweet,
            totalGenerated: allTweets.length
          })
        }
      }

      // If a batch produced nothing, stop to avoid infinite loop
      if (batchTweets.length === 0) break
    }

    onProgress({ type: 'done', totalGenerated: allTweets.length })
    return allTweets
  }

  private truncateTo280(text: string): string {
    if (text.length <= 280) return text
    const truncated = text.slice(0, 277)
    const lastSpace = truncated.lastIndexOf(' ')
    if (lastSpace > 200) {
      return truncated.slice(0, lastSpace) + '...'
    }
    return truncated + '...'
  }

  async regenerateSingleTweet(
    threadContent: string[],
    tweetIndex: number,
    style: string,
    language?: string
  ): Promise<string> {
    if (!this.client) throw new Error('AI client not initialized')

    const lang = language || 'French'
    const context = threadContent
      .map((t, i) => (i === tweetIndex ? '[REGENERATE THIS TWEET]' : t))
      .join('\n---\n')

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: `You are rewriting one tweet in a thread. Write in ${lang}. Keep the same topic and flow. Style: ${style}. Return ONLY the new tweet text, nothing else. Must be under 280 characters.`,
      messages: [
        {
          role: 'user',
          content: `Here is the full thread. Regenerate the tweet marked [REGENERATE THIS TWEET]:\n\n${context}`
        }
      ]
    })

    return (response.content[0] as { type: 'text'; text: string }).text.trim()
  }
}

export const aiService = new AIService()
