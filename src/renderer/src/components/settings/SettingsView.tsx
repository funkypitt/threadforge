import { useState, useEffect } from 'react'
import { ArrowLeft, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useUIStore } from '@/stores/uiStore'

interface ConnectionStatus {
  tested: boolean
  success: boolean
  message: string
}

export function SettingsView(): JSX.Element {
  const setActiveView = useUIStore((s) => s.setActiveView)

  const [xAppKey, setXAppKey] = useState('')
  const [xAppSecret, setXAppSecret] = useState('')
  const [xAccessToken, setXAccessToken] = useState('')
  const [xAccessSecret, setXAccessSecret] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')

  const [xStatus, setXStatus] = useState<ConnectionStatus>({ tested: false, success: false, message: '' })
  const [aiStatus, setAiStatus] = useState<ConnectionStatus>({ tested: false, success: false, message: '' })
  const [saving, setSaving] = useState(false)
  const [testingX, setTestingX] = useState(false)
  const [testingAI, setTestingAI] = useState(false)

  useEffect(() => {
    window.api.getSettings().then((settings) => {
      if (settings.x_app_key) setXAppKey('••••••••')
      if (settings.x_app_secret) setXAppSecret('••••••••')
      if (settings.x_access_token) setXAccessToken('••••••••')
      if (settings.x_access_secret) setXAccessSecret('••••••••')
      if (settings.anthropic_api_key) setAnthropicKey('••••••••')
    })
  }, [])

  const saveXCredentials = async () => {
    setSaving(true)
    const promises: Promise<void>[] = []
    if (xAppKey && xAppKey !== '••••••••') promises.push(window.api.setSetting('x_app_key', xAppKey))
    if (xAppSecret && xAppSecret !== '••••••••') promises.push(window.api.setSetting('x_app_secret', xAppSecret))
    if (xAccessToken && xAccessToken !== '••••••••') promises.push(window.api.setSetting('x_access_token', xAccessToken))
    if (xAccessSecret && xAccessSecret !== '••••••••') promises.push(window.api.setSetting('x_access_secret', xAccessSecret))
    await Promise.all(promises)
    setSaving(false)
  }

  const saveAnthropicKey = async () => {
    setSaving(true)
    if (anthropicKey && anthropicKey !== '••••••••') {
      await window.api.setSetting('anthropic_api_key', anthropicKey)
    }
    setSaving(false)
  }

  const testX = async () => {
    setTestingX(true)
    await saveXCredentials()
    const result = await window.api.testXConnection()
    setXStatus({
      tested: true,
      success: result.success,
      message: result.success ? `Connected as @${result.username}` : result.error || 'Failed'
    })
    setTestingX(false)
  }

  const testAI = async () => {
    setTestingAI(true)
    await saveAnthropicKey()
    const result = await window.api.testAIConnection()
    setAiStatus({
      tested: true,
      success: result.success,
      message: result.success ? `Model: ${result.model}` : result.error || 'Failed'
    })
    setTestingAI(false)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto py-8 px-6">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setActiveView('editor')}>
            <ArrowLeft size={18} />
          </Button>
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        {/* X API Credentials */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">X (Twitter) API</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">API Key (Consumer Key)</label>
              <input
                type="password"
                value={xAppKey}
                onChange={(e) => setXAppKey(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                placeholder="Enter your API key"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">API Secret</label>
              <input
                type="password"
                value={xAppSecret}
                onChange={(e) => setXAppSecret(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                placeholder="Enter your API secret"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Access Token</label>
              <input
                type="password"
                value={xAccessToken}
                onChange={(e) => setXAccessToken(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                placeholder="Enter your access token"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Access Token Secret</label>
              <input
                type="password"
                value={xAccessSecret}
                onChange={(e) => setXAccessSecret(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                placeholder="Enter your access token secret"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={testX} disabled={testingX}>
                {testingX ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
                Test Connection
              </Button>
              {xStatus.tested && (
                <span className={`text-sm flex items-center gap-1 ${xStatus.success ? 'text-success' : 'text-danger'}`}>
                  {xStatus.success ? <Check size={14} /> : <X size={14} />}
                  {xStatus.message}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Claude API */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Claude AI</h2>
          <p className="text-xs text-text-muted mb-3">
            Leave empty to use ANTHROPIC_API_KEY environment variable.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">API Key</label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
                placeholder="sk-ant-..."
              />
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={testAI} disabled={testingAI}>
                {testingAI ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
                Test Connection
              </Button>
              {aiStatus.tested && (
                <span className={`text-sm flex items-center gap-1 ${aiStatus.success ? 'text-success' : 'text-danger'}`}>
                  {aiStatus.success ? <Check size={14} /> : <X size={14} />}
                  {aiStatus.message}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Archive path */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4">X Archives</h2>
          <p className="text-sm text-text-muted">
            Place X archive ZIP files in the <code className="text-accent">archives/</code> folder
            in the app directory to use them for AI-powered thread generation from your tweet history.
          </p>
        </section>
      </div>
    </div>
  )
}
