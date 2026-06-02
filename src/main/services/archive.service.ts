import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join, extname } from 'path'
import { execSync } from 'child_process'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'

export interface ArchiveTweet {
  id: string
  text: string
  created_at: string
  source: string
  account: string
  is_retweet: boolean
  media_files: string[]
  entities: {
    hashtags: string[]
    urls: string[]
    user_mentions: string[]
  }
}

interface ArchiveAccount {
  username: string
  displayName: string
  dir: string
  mediaDir: string | null
}

export class ArchiveService {
  private tweets: ArchiveTweet[] = []
  private accounts: ArchiveAccount[] = []
  private loaded = false

  loadArchives(archivesDir: string): number {
    if (!existsSync(archivesDir)) return 0

    this.tweets = []
    this.accounts = []

    const entries = readdirSync(archivesDir)

    // Load extracted directories first
    for (const entry of entries) {
      const fullPath = join(archivesDir, entry)
      if (!statSync(fullPath).isDirectory()) continue
      const tweetsJsPath = join(fullPath, 'data', 'tweets.js')
      if (!existsSync(tweetsJsPath)) continue

      const account = this.readAccountInfo(fullPath, entry)
      this.accounts.push(account)

      const tweets = this.parseTweetsJs(tweetsJsPath, account)
      this.tweets.push(...tweets)
    }

    // Fall back to ZIP files (only those without a matching extracted directory)
    const extractedNames = new Set(this.accounts.map((a) => a.username.toLowerCase()))
    const zipFiles = entries.filter(
      (f) => extname(f).toLowerCase() === '.zip'
    )
    for (const zipFile of zipFiles) {
      const zipPath = join(archivesDir, zipFile)
      const zipAccount = this.peekAccountFromZip(zipPath)
      if (zipAccount && extractedNames.has(zipAccount.toLowerCase())) continue

      const tweets = this.extractTweetsFromZip(zipPath)
      this.tweets.push(...tweets)
    }

    this.tweets.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    this.loaded = true
    return this.tweets.length
  }

  private readAccountInfo(dir: string, fallbackName: string): ArchiveAccount {
    const accountJsPath = join(dir, 'data', 'account.js')
    let username = fallbackName
    let displayName = fallbackName

    if (existsSync(accountJsPath)) {
      try {
        const raw = readFileSync(accountJsPath, 'utf-8')
        const json = JSON.parse(raw.replace(/^window\.YTD\.account\.part0\s*=\s*/, ''))
        username = json[0]?.account?.username || fallbackName
        displayName = json[0]?.account?.accountDisplayName || username
      } catch {}
    }

    const mediaDir = join(dir, 'data', 'tweets_media')

    return {
      username,
      displayName,
      dir,
      mediaDir: existsSync(mediaDir) ? mediaDir : null
    }
  }

  private parseTweetsJs(tweetsJsPath: string, account: ArchiveAccount): ArchiveTweet[] {
    try {
      const raw = readFileSync(tweetsJsPath, 'utf-8')
      const jsonStr = raw.replace(/^window\.YTD\.tweets\.part0\s*=\s*/, '')
      const data = JSON.parse(jsonStr) as Array<{ tweet: Record<string, unknown> }>

      return data.map((item) => {
        const t = item.tweet as any
        const tweetId = t.id_str || t.id || ''

        const mediaFiles = this.findMediaForTweet(tweetId, t, account)

        return {
          id: tweetId,
          text: t.full_text || t.text || '',
          created_at: t.created_at || '',
          source: (t.source || '').replace(/<[^>]+>/g, ''),
          account: account.username,
          is_retweet: (t.full_text || t.text || '').startsWith('RT @'),
          media_files: mediaFiles,
          entities: {
            hashtags: (t.entities?.hashtags || []).map((h: any) => h.text),
            urls: (t.entities?.urls || []).map((u: any) => u.expanded_url || u.url),
            user_mentions: (t.entities?.user_mentions || []).map((m: any) => m.screen_name)
          }
        }
      })
    } catch {
      return []
    }
  }

  private findMediaForTweet(
    tweetId: string,
    tweetData: any,
    account: ArchiveAccount
  ): string[] {
    if (!account.mediaDir) return []

    const files: string[] = []

    // X archives name media files as: {tweetId}-{mediaKey}.{ext}
    // e.g. 1731039092064891055-GAXiApnXkAAq7X_.png
    try {
      const allFiles = readdirSync(account.mediaDir)
      const matching = allFiles.filter((f) => f.startsWith(tweetId + '-'))
      for (const f of matching) {
        files.push(join(account.mediaDir, f))
      }
    } catch {}

    // Also check extended_entities for media metadata
    const extMedia = tweetData.extended_entities?.media || tweetData.entities?.media || []
    for (const m of extMedia) {
      const mediaId = m.id_str || ''
      if (mediaId) {
        try {
          const allFiles = readdirSync(account.mediaDir)
          const match = allFiles.find((f) => f.includes(mediaId))
          if (match) {
            const fullPath = join(account.mediaDir, match)
            if (!files.includes(fullPath)) files.push(fullPath)
          }
        } catch {}
      }
    }

    return files
  }

  private peekAccountFromZip(zipPath: string): string | null {
    try {
      const raw = execSync(
        `unzip -p "${zipPath}" "data/account.js" 2>/dev/null`,
        { timeout: 10000 }
      ).toString()
      const json = JSON.parse(raw.replace(/^window\.YTD\.account\.part0\s*=\s*/, ''))
      return json[0]?.account?.username || null
    } catch {
      return null
    }
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
          account: 'unknown',
          is_retweet: (t.full_text || t.text || '').startsWith('RT @'),
          media_files: [],
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
      } catch {}
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

  searchTweetsWithMedia(query: string, limit = 50): ArchiveTweet[] {
    return this.searchTweets(query, limit * 3)
      .filter((t) => t.media_files.length > 0)
      .slice(0, limit)
  }

  getAccounts(): ArchiveAccount[] {
    return this.accounts
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

  getMediaCount(): number {
    return this.tweets.reduce((sum, t) => sum + t.media_files.length, 0)
  }
}

export const archiveService = new ArchiveService()
