import { readFileSync, existsSync, statSync } from 'fs'
import { extname, basename } from 'path'
import { execSync } from 'child_process'
import { mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

export interface DocumentContent {
  fileName: string
  text: string
  type: string
  charCount: number
}

export class DocumentService {
  extractText(filePath: string): DocumentContent {
    if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`)

    const ext = extname(filePath).toLowerCase()
    const fileName = basename(filePath)
    let text = ''

    switch (ext) {
      case '.txt':
      case '.md':
      case '.csv':
      case '.tsv':
        text = readFileSync(filePath, 'utf-8')
        break
      case '.html':
      case '.htm':
        text = this.extractHtml(filePath)
        break
      case '.pdf':
        text = this.extractPdf(filePath)
        break
      case '.epub':
        text = this.extractEpub(filePath)
        break
      case '.docx':
        text = this.extractDocx(filePath)
        break
      case '.json':
        text = readFileSync(filePath, 'utf-8')
        break
      default:
        text = readFileSync(filePath, 'utf-8')
    }

    return {
      fileName,
      text: text.slice(0, 100000),
      type: ext.replace('.', ''),
      charCount: text.length
    }
  }

  private extractHtml(filePath: string): string {
    const html = readFileSync(filePath, 'utf-8')
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private extractPdf(filePath: string): string {
    try {
      return execSync(`pdftotext "${filePath}" -`, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024
      }).toString()
    } catch {
      throw new Error('PDF extraction requires pdftotext (install poppler-utils)')
    }
  }

  private extractEpub(filePath: string): string {
    const tmpDir = mkdtempSync(join(tmpdir(), 'threadforge-epub-'))
    try {
      execSync(`unzip -o "${filePath}" -d "${tmpDir}" 2>/dev/null`, { timeout: 30000 })
      const htmlFiles = execSync(`find "${tmpDir}" -name "*.html" -o -name "*.xhtml" | sort`)
        .toString()
        .trim()
        .split('\n')
        .filter(Boolean)

      let text = ''
      for (const htmlFile of htmlFiles) {
        const html = readFileSync(htmlFile, 'utf-8')
        const cleaned = html
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        text += cleaned + '\n\n'
      }
      return text
    } catch {
      throw new Error('EPUB extraction failed')
    } finally {
      try {
        execSync(`rm -rf "${tmpDir}"`)
      } catch {}
    }
  }

  private extractDocx(filePath: string): string {
    const tmpDir = mkdtempSync(join(tmpdir(), 'threadforge-docx-'))
    try {
      execSync(`unzip -o "${filePath}" "word/document.xml" -d "${tmpDir}" 2>/dev/null`, {
        timeout: 30000
      })
      const xmlPath = join(tmpDir, 'word', 'document.xml')
      if (!existsSync(xmlPath)) throw new Error('No document.xml found')

      const xml = readFileSync(xmlPath, 'utf-8')
      return xml
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    } catch {
      throw new Error('DOCX extraction failed')
    } finally {
      try {
        execSync(`rm -rf "${tmpDir}"`)
      } catch {}
    }
  }
}

export const documentService = new DocumentService()
