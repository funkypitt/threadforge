import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { execSync } from 'child_process'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'

export interface ArchiveTweet {
  id: string
  text: string
  created_at: string
  source: string
  is_retweet: boolean
  entities: {
    hashtags: string[]
    urls: string[]
    user_mentions: string[]
  }
}

export class ArchiveService {
  private tweets: ArchiveTweet[] = []
  private loaded = false

  loadArchives(archivesDir: string): number {
    if (!existsSync(archivesDir)) return 0

    const zipFiles = readdirSync(archivesDir).filter((f) => extname(f).toLowerCase() === '.zip')
    let totalTweets = 0

    for (const zipFile of zipFiles) {
      const zipPath = join(archivesDir, zipFile)
      const tweets = this.extractTweetsFromZip(zipPath)
      this.tweets.push(...tweets)
      totalTweets += tweets.length
    }

    this.tweets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    this.loaded = true
    return totalTweets
  }

  private extractTweetsFromZip(zipPath: string): ArchiveTweet[] {
    const tmpDir = mkdtempSync(join(tmpdir(), 'threadforge-archive-'))

    try {
      execSync(`unzip -o -j "${zipPath}" "*/tweets.js" -d "${tmpDir}" 2>/dev/null || true`, {
        timeout: 60000
      })

      const tweetsJsPath = join(tmpDir, 'tweets.js')
      if (!existsSync(tweetsJsPath)) return []

      const raw = readFileSync(tweetsJsPath, 'utf-8')
      const jsonStr = raw.replace(/^window\.YTD\.tweets\.part0\s*=\s*/, '')
      const data = JSON.parse(jsonStr) as Array<{ tweet: Record<string, unknown> }>

      return data.map((item) => {
        const t = item.tweet as any
        return {
          id: t.id_str || t.id || '',
          text: t.full_text || t.text || '',
          created_at: t.created_at || '',
          source: (t.source || '').replace(/<[^>]+>/g, ''),
          is_retweet: (t.full_text || t.text || '').startsWith('RT @'),
          entities: {
            hashtags: (t.entities?.hashtags || []).map((h: any) => h.text),
            urls: (t.entities?.urls || []).map((u: any) => u.expanded_url || u.url),
            user_mentions: (t.entities?.user_mentions || []).map((m: any) => m.screen_name)
          }
        }
      })
    } catch {
      return []
    } finally {
      try {
        execSync(`rm -rf "${tmpDir}"`)
      } catch {
        // cleanup best-effort
      }
    }
  }

  searchTweets(query: string, limit = 100): ArchiveTweet[] {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
    return this.tweets
      .filter((tweet) => {
        if (tweet.is_retweet) return false
        const text = tweet.text.toLowerCase()
        return terms.every((term) => text.includes(term))
      })
      .slice(0, limit)
  }

  getAllTweets(): ArchiveTweet[] {
    return this.tweets.filter((t) => !t.is_retweet)
  }

  isLoaded(): boolean {
    return this.loaded
  }

  getTweetCount(): number {
    return this.tweets.length
  }
}

export const archiveService = new ArchiveService()
