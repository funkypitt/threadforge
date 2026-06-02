import { useState, useEffect } from 'react'
import { Sparkles, X, RefreshCw, Archive, FileText, Plus, Trash2, Video, Link, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useEditorStore } from '@/stores/editorStore'
import { useUIStore } from '@/stores/uiStore'
import { useDraftsStore } from '@/stores/draftsStore'

const STYLES = ['Professional', 'Casual', 'Humorous', 'Educational', 'Provocative', 'Storytelling']
const LANGUAGES = ['French', 'English', 'Spanish', 'German', 'Italian', 'Portuguese']
type SourceMode = 'prompt' | 'documents' | 'archive' | 'media' | 'long'

export function AIPanel(): JSX.Element {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('Professional')
  const [language, setLanguage] = useState('French')
  const [tweetCount, setTweetCount] = useState(7)
  const [loading, setLoading] = useState(false)
  const [sourceMode, setSourceMode] = useState<SourceMode>('prompt')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [archiveQuery, setArchiveQuery] = useState('')
  const [archiveStatus, setArchiveStatus] = useState<{
    loaded: boolean
    tweetCount: number
    mediaCount?: number
    accounts?: Array<{ username: string; displayName: string }>
  }>({
    loaded: false,
    tweetCount: 0
  })
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [mediaFiles, setMediaFiles] = useState<string[]>([])
  const [transcribing, setTranscribing] = useState(false)
  const [transcription, setTranscription] = useState<string | null>(null)
  const [longPrompt, setLongPrompt] = useState('')
  const [longCount, setLongCount] = useState(100)
  const [longUseArchive, setLongUseArchive] = useState(true)
  const [longArchiveQuery, setLongArchiveQuery] = useState('')
  const [longDocFiles, setLongDocFiles] = useState<string[]>([])
  const [longProgress, setLongProgress] = useState(0)

  const aiPanelOpen = useUIStore((s) => s.aiPanelOpen)
  const toggleAIPanel = useUIStore((s) => s.toggleAIPanel)
  const replaceAllTweets = useEditorStore((s) => s.replaceAllTweets)
  const setSelectedThread = useUIStore((s) => s.setSelectedThread)
  const refreshDrafts = useDraftsStore((s) => s.refresh)

  useEffect(() => {
    if (aiPanelOpen) {
      window.api.getArchiveStatus().then(setArchiveStatus).catch(() => {})
    }
  }, [aiPanelOpen])

  if (!aiPanelOpen) return <></>

  const handleAddFiles = async () => {
    const paths = await window.api.selectSourceFiles()
    if (paths.length > 0) {
      setSelectedFiles((prev) => [...prev, ...paths])
    }
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleLoadArchives = async () => {
    const result = await window.api.loadArchives()
    setArchiveStatus(result)
  }

  const handleTranscribe = async () => {
    setTranscribing(true)
    try {
      let result: any
      if (youtubeUrl.trim()) {
        result = await window.api.transcribeYouTube(youtubeUrl)
      } else if (mediaFiles.length > 0) {
        result = await window.api.transcribeFile(mediaFiles[0])
      }
      if (result) {
        setTranscription(result.text)
      }
    } catch (err: any) {
      console.error('Transcription failed:', err?.message || err)
    } finally {
      setTranscribing(false)
    }
  }

  const handleAddMediaFiles = async () => {
    const paths = await window.api.selectMediaSourceFiles()
    if (paths.length > 0) setMediaFiles(paths)
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      let thread: any

      if (sourceMode === 'documents' && selectedFiles.length > 0) {
        thread = await window.api.generateFromDocument({
          filePaths: selectedFiles,
          prompt: prompt || 'Create a compelling thread summarizing this content',
          style: style.toLowerCase(), language,
          tweetCount
        })
      } else if (sourceMode === 'archive') {
        thread = await window.api.generateFromArchive({
          query: archiveQuery,
          style: style.toLowerCase(), language,
          tweetCount
        })
      } else if (sourceMode === 'media' && transcription) {
        thread = await window.api.generateFromTranscription({
          transcription,
          source: youtubeUrl || mediaFiles[0] || 'media',
          prompt: prompt || 'Create a thread summarizing the key points',
          style: style.toLowerCase(), language,
          tweetCount
        })
      } else if (sourceMode === 'long') {
        const cleanup = window.api.onAIStream((_ev: unknown, data: unknown) => {
          const d = data as { totalGenerated?: number }
          if (d.totalGenerated) setLongProgress(d.totalGenerated)
        })
        try {
          thread = await window.api.generateLongThread({
            prompt: longPrompt,
            tweetCount: longCount,
            style: style.toLowerCase(), language,
            useArchive: longUseArchive,
            archiveQuery: longArchiveQuery || undefined,
            filePaths: longDocFiles.length > 0 ? longDocFiles : undefined
          })
        } finally {
          cleanup()
          setLongProgress(0)
        }
      } else {
        thread = await window.api.generateThread(prompt, {
          style: style.toLowerCase(), language,
          tweetCount
        })
      }

      replaceAllTweets(thread)
      setSelectedThread(thread.id)
      refreshDrafts()
    } catch (err: any) {
      console.error('Generation failed:', err?.message || err)
    } finally {
      setLoading(false)
    }
  }

  const isReady = () => {
    if (sourceMode === 'prompt') return prompt.trim().length > 0
    if (sourceMode === 'documents') return selectedFiles.length > 0
    if (sourceMode === 'archive') return archiveQuery.trim().length > 0
    if (sourceMode === 'media') return !!transcription
    if (sourceMode === 'long') return longPrompt.trim().length > 0
    return false
  }

  return (
    <div className="w-80 border-l border-border bg-bg-primary flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <span className="text-sm font-semibold">AI Generate</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleAIPanel}>
          <X size={14} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Source mode tabs */}
        <div className="flex gap-1 bg-bg-secondary rounded-lg p-1">
          <button
            onClick={() => setSourceMode('prompt')}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${sourceMode === 'prompt' ? 'bg-bg-tertiary text-text-primary' : 'text-text-muted'}`}
          >
            Prompt
          </button>
          <button
            onClick={() => setSourceMode('documents')}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors flex items-center justify-center gap-1 ${sourceMode === 'documents' ? 'bg-bg-tertiary text-text-primary' : 'text-text-muted'}`}
          >
            <FileText size={11} />
            Docs
          </button>
          <button
            onClick={() => setSourceMode('archive')}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors flex items-center justify-center gap-1 ${sourceMode === 'archive' ? 'bg-bg-tertiary text-text-primary' : 'text-text-muted'}`}
          >
            <Archive size={11} />
            Archive
          </button>
          <button
            onClick={() => setSourceMode('media')}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors flex items-center justify-center gap-1 ${sourceMode === 'media' ? 'bg-bg-tertiary text-text-primary' : 'text-text-muted'}`}
          >
            <Video size={11} />
            A/V
          </button>
          <button
            onClick={() => setSourceMode('long')}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors flex items-center justify-center gap-1 ${sourceMode === 'long' ? 'bg-bg-tertiary text-text-primary' : 'text-text-muted'}`}
          >
            <ScrollText size={11} />
            Epic
          </button>
        </div>

        {/* Source-specific inputs */}
        {sourceMode === 'prompt' && (
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Topic / Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What's your thread about?"
              className="w-full bg-bg-secondary border border-border rounded-lg p-3 text-sm text-text-primary resize-none outline-none focus:border-accent placeholder:text-text-muted"
              rows={4}
            />
          </div>
        )}

        {sourceMode === 'documents' && (
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Source Documents</label>
            <div className="space-y-1.5 mb-2">
              {selectedFiles.map((path, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-bg-secondary rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <FileText size={12} className="text-accent flex-shrink-0" />
                  <span className="truncate flex-1 text-text-secondary">
                    {path.split('/').pop()}
                  </span>
                  <button onClick={() => handleRemoveFile(i)} className="text-text-muted hover:text-danger">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleAddFiles} className="w-full">
              <Plus size={14} className="mr-1" />
              Add Files
            </Button>
            <p className="text-[11px] text-text-muted mt-2">
              Supports PDF, EPUB, DOCX, HTML, TXT, MD, JSON, CSV
            </p>

            <label className="text-xs text-text-muted block mb-1.5 mt-4">Instructions (optional)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Focus on key arguments, include dates..."
              className="w-full bg-bg-secondary border border-border rounded-lg p-3 text-sm text-text-primary resize-none outline-none focus:border-accent placeholder:text-text-muted"
              rows={3}
            />
          </div>
        )}

        {sourceMode === 'archive' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-text-muted">X Archive Search</label>
              {archiveStatus.loaded ? (
                <span className="text-[11px] text-success">
                  {archiveStatus.tweetCount.toLocaleString()} tweets loaded
                </span>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleLoadArchives} className="text-[11px] h-5">
                  Load Archives
                </Button>
              )}
            </div>

            {archiveStatus.loaded && archiveStatus.accounts && archiveStatus.accounts.length > 0 && (
              <div className="space-y-1 mb-3">
                {archiveStatus.accounts.map((a) => (
                  <div key={a.username} className="flex items-center gap-2 bg-bg-secondary rounded-lg px-2.5 py-1.5 text-xs">
                    <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-[10px] text-accent font-bold">
                      @
                    </div>
                    <span className="text-text-secondary">{a.displayName}</span>
                    <span className="text-text-muted">@{a.username}</span>
                  </div>
                ))}
                {archiveStatus.mediaCount !== undefined && archiveStatus.mediaCount > 0 && (
                  <p className="text-[11px] text-text-muted px-1">
                    {archiveStatus.mediaCount.toLocaleString()} media files available
                  </p>
                )}
              </div>
            )}

            <textarea
              value={archiveQuery}
              onChange={(e) => setArchiveQuery(e.target.value)}
              placeholder='e.g. "ivermectin", "covid treatment timeline"'
              className="w-full bg-bg-secondary border border-border rounded-lg p-3 text-sm text-text-primary resize-none outline-none focus:border-accent placeholder:text-text-muted"
              rows={3}
            />
            <p className="text-[11px] text-text-muted mt-1.5">
              Searches your X archive tweets and uses matching results as context for thread generation.
              Media from matching tweets can be reattached.
            </p>
          </div>
        )}

        {sourceMode === 'media' && (
          <div>
            <label className="text-xs text-text-muted block mb-1.5">YouTube URL or Local File</label>
            <div className="flex gap-2 mb-2">
              <div className="flex-1 relative">
                <Link size={12} className="absolute left-2.5 top-2.5 text-text-muted" />
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-bg-secondary border border-border rounded-lg pl-7 pr-3 py-2 text-xs text-text-primary outline-none focus:border-accent placeholder:text-text-muted"
                />
              </div>
            </div>
            <div className="text-[11px] text-text-muted text-center mb-2">or</div>
            <Button variant="outline" size="sm" onClick={handleAddMediaFiles} className="w-full mb-2">
              <Video size={14} className="mr-1" />
              Select Audio/Video File
            </Button>
            {mediaFiles.length > 0 && (
              <div className="space-y-1 mb-2">
                {mediaFiles.map((f, i) => (
                  <div key={i} className="text-xs text-text-secondary bg-bg-secondary rounded px-2 py-1 truncate">
                    {f.split('/').pop()}
                  </div>
                ))}
              </div>
            )}

            {!transcription ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                disabled={transcribing || (!youtubeUrl.trim() && mediaFiles.length === 0)}
                onClick={handleTranscribe}
              >
                {transcribing ? (
                  <>
                    <RefreshCw size={12} className="mr-1 animate-spin" />
                    Transcribing...
                  </>
                ) : (
                  'Transcribe'
                )}
              </Button>
            ) : (
              <div className="bg-bg-secondary rounded-lg p-2 text-xs text-text-secondary max-h-32 overflow-y-auto">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-success font-medium">Transcription ready</span>
                  <span className="text-text-muted">{transcription.length.toLocaleString()} chars</span>
                </div>
                <p className="line-clamp-4">{transcription.slice(0, 300)}...</p>
              </div>
            )}

            <label className="text-xs text-text-muted block mb-1.5 mt-3">Instructions (optional)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Focus on the key arguments, make it punchy..."
              className="w-full bg-bg-secondary border border-border rounded-lg p-3 text-sm text-text-primary resize-none outline-none focus:border-accent placeholder:text-text-muted"
              rows={2}
            />
          </div>
        )}

        {sourceMode === 'long' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ScrollText size={16} className="text-accent" />
              <span className="text-sm font-semibold">Epic Thread Builder</span>
            </div>

            <label className="text-xs text-text-muted block mb-1.5">Narrative Prompt</label>
            <textarea
              value={longPrompt}
              onChange={(e) => setLongPrompt(e.target.value)}
              placeholder='e.g. "Tell the story of the ivermectin controversy chronologically, covering the key studies, political reactions, and scientific debates..."'
              className="w-full bg-bg-secondary border border-border rounded-lg p-3 text-sm text-text-primary resize-none outline-none focus:border-accent placeholder:text-text-muted"
              rows={5}
            />

            <label className="text-xs text-text-muted block mb-1.5 mt-3">
              Target tweets: {longCount}
            </label>
            <input
              type="range"
              min={20}
              max={250}
              step={10}
              value={longCount}
              onChange={(e) => setLongCount(parseInt(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-text-muted -mt-0.5 mb-3">
              <span>20</span>
              <span>~{Math.ceil(longCount / 15)} batches</span>
              <span>250</span>
            </div>

            {/* Archive source toggle */}
            <div className="flex items-center justify-between bg-bg-secondary rounded-lg px-3 py-2 mb-2">
              <div className="flex items-center gap-2">
                <Archive size={14} className="text-text-muted" />
                <span className="text-xs text-text-secondary">Use X Archives</span>
              </div>
              <button
                onClick={() => setLongUseArchive(!longUseArchive)}
                className={`w-8 h-4 rounded-full transition-colors ${longUseArchive ? 'bg-accent' : 'bg-border'}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${longUseArchive ? 'translate-x-4' : ''}`} />
              </button>
            </div>

            {longUseArchive && (
              <div className="mb-3">
                <input
                  type="text"
                  value={longArchiveQuery}
                  onChange={(e) => setLongArchiveQuery(e.target.value)}
                  placeholder="Archive search terms (e.g. ivermectin covid)"
                  className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-text-primary outline-none focus:border-accent placeholder:text-text-muted"
                />
              </div>
            )}

            {/* Document sources */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-muted">Additional documents</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-[11px] h-5"
                onClick={async () => {
                  const paths = await window.api.selectSourceFiles()
                  if (paths.length > 0) setLongDocFiles((prev) => [...prev, ...paths])
                }}
              >
                <Plus size={10} className="mr-0.5" />
                Add
              </Button>
            </div>
            {longDocFiles.length > 0 && (
              <div className="space-y-1 mb-2">
                {longDocFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-bg-secondary rounded px-2 py-1 text-xs">
                    <FileText size={10} className="text-accent" />
                    <span className="truncate flex-1 text-text-secondary">{f.split('/').pop()}</span>
                    <button onClick={() => setLongDocFiles((prev) => prev.filter((_, j) => j !== i))} className="text-text-muted hover:text-danger">
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {loading && longProgress > 0 && (
              <div className="bg-bg-secondary rounded-lg p-3 mt-2">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-accent font-medium">Generating...</span>
                  <span className="text-text-muted">{longProgress}/{longCount} tweets</span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-1.5">
                  <div
                    className="bg-accent rounded-full h-1.5 transition-all"
                    style={{ width: `${(longProgress / longCount) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Style selector */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">Style</label>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  style === s
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-border text-text-muted hover:border-border-hover'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="text-xs text-text-muted block mb-1.5">Language</label>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  language === l
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-border text-text-muted hover:border-border-hover'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Tweet count (hidden in long mode — it has its own) */}
        {sourceMode !== 'long' && <div>
          <label className="text-xs text-text-muted block mb-1.5">Tweets: {tweetCount}</label>
          <input
            type="range"
            min={3}
            max={15}
            value={tweetCount}
            onChange={(e) => setTweetCount(parseInt(e.target.value))}
            className="w-full accent-accent"
          />
        </div>}
      </div>

      {/* Generate button */}
      <div className="p-4 border-t border-border">
        <Button className="w-full" disabled={loading || !isReady()} onClick={handleGenerate}>
          {loading ? (
            <>
              <RefreshCw size={14} className="mr-1.5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={14} className="mr-1.5" />
              Generate Thread
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
