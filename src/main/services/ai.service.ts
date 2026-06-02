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
      systemPrompt?: string
    },
    onStream: (event: AIStreamEvent) => void
  ): Promise<string[]> {
    if (!this.client) throw new Error('AI client not initialized')

    const count = options.tweetCount || 7
    const style = options.style || 'professional'

    const defaultSystem = `You are a Twitter/X thread writer. Generate a thread of ${count} tweets about the given topic.

Rules:
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
          tweets.push(parts[0].trim())
          onStream({ type: 'tweet_complete', tweetIndex: tweets.length - 1 })
          currentTweet = parts.slice(1).join('---TWEET_BREAK---')
        }
      }
    }

    if (currentTweet.trim()) {
      tweets.push(currentTweet.trim())
      onStream({ type: 'tweet_complete', tweetIndex: tweets.length - 1 })
    }

    onStream({ type: 'done' })
    return tweets
  }

  async regenerateSingleTweet(
    threadContent: string[],
    tweetIndex: number,
    style: string
  ): Promise<string> {
    if (!this.client) throw new Error('AI client not initialized')

    const context = threadContent
      .map((t, i) => (i === tweetIndex ? '[REGENERATE THIS TWEET]' : t))
      .join('\n---\n')

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: `You are rewriting one tweet in a thread. Keep the same topic and flow. Style: ${style}. Return ONLY the new tweet text, nothing else. Must be under 280 characters.`,
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
