import { execSync } from 'child_process'
import { existsSync, readFileSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

export interface TranscriptionResult {
  text: string
  source: string
  duration?: string
}

export class TranscriptionService {
  private condaEnv = 'interview'

  async transcribeYouTube(url: string): Promise<TranscriptionResult> {
    const tmpDir = mkdtempSync(join(tmpdir(), 'threadforge-yt-'))
    const outputPath = join(tmpDir, 'audio.wav')

    try {
      execSync(
        `yt-dlp --extract-audio --audio-format wav -o "${outputPath}" "${url}" 2>&1`,
        { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
      )

      const text = this.runWhisper(outputPath)
      return { text, source: url }
    } finally {
      try {
        execSync(`rm -rf "${tmpDir}"`)
      } catch {}
    }
  }

  async transcribeFile(filePath: string): Promise<TranscriptionResult> {
    if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

    const ext = filePath.split('.').pop()?.toLowerCase()
    const isVideo = ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext || '')
    const isAudio = ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'].includes(ext || '')

    if (!isVideo && !isAudio) {
      throw new Error(`Unsupported media format: .${ext}`)
    }

    let audioPath = filePath
    const tmpDir = mkdtempSync(join(tmpdir(), 'threadforge-transcribe-'))

    try {
      if (isVideo) {
        audioPath = join(tmpDir, 'audio.wav')
        execSync(`ffmpeg -i "${filePath}" -vn -acodec pcm_s16le -ar 16000 "${audioPath}" 2>&1`, {
          timeout: 300000
        })
      }

      const text = this.runWhisper(audioPath)
      return { text, source: filePath }
    } finally {
      try {
        execSync(`rm -rf "${tmpDir}"`)
      } catch {}
    }
  }

  private runWhisper(audioPath: string): string {
    const tmpDir = mkdtempSync(join(tmpdir(), 'threadforge-whisper-'))
    const outputBase = join(tmpDir, 'output')

    try {
      execSync(
        `bash -c "source activate ${this.condaEnv} 2>/dev/null; whisper '${audioPath}' --model small --output_format txt --output_dir '${tmpDir}'" 2>&1`,
        { timeout: 600000, maxBuffer: 10 * 1024 * 1024 }
      )

      const txtFiles = execSync(`find "${tmpDir}" -name "*.txt" -type f`)
        .toString()
        .trim()
        .split('\n')
        .filter(Boolean)

      if (txtFiles.length === 0) {
        throw new Error('Whisper produced no output')
      }

      return txtFiles.map((f) => readFileSync(f, 'utf-8')).join('\n')
    } catch (err: any) {
      const fallback = this.runWhisperFallback(audioPath, tmpDir)
      if (fallback) return fallback
      throw new Error(
        `Transcription failed. Ensure whisper is installed in conda env "${this.condaEnv}". Error: ${err.message}`
      )
    } finally {
      try {
        execSync(`rm -rf "${tmpDir}"`)
      } catch {}
    }
  }

  private runWhisperFallback(audioPath: string, tmpDir: string): string | null {
    try {
      execSync(
        `whisper "${audioPath}" --model small --output_format txt --output_dir "${tmpDir}" 2>&1`,
        { timeout: 600000, maxBuffer: 10 * 1024 * 1024 }
      )

      const txtFiles = execSync(`find "${tmpDir}" -name "*.txt" -type f`)
        .toString()
        .trim()
        .split('\n')
        .filter(Boolean)

      if (txtFiles.length > 0) {
        return txtFiles.map((f) => readFileSync(f, 'utf-8')).join('\n')
      }
    } catch {}
    return null
  }
}

export const transcriptionService = new TranscriptionService()
