import { useState } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Zap,
  Twitter,
  Sparkles,
  Rocket
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

type Step = 'welcome' | 'x-api' | 'claude-api' | 'done'
const STEPS: Step[] = ['welcome', 'x-api', 'claude-api', 'done']

interface SetupWizardProps {
  onComplete: () => void
}

export function SetupWizard({ onComplete }: SetupWizardProps): JSX.Element {
  const [step, setStep] = useState<Step>('welcome')
  const stepIndex = STEPS.indexOf(step)

  const next = () => setStep(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)])
  const prev = () => setStep(STEPS[Math.max(stepIndex - 1, 0)])

  return (
    <div className="h-screen bg-bg-primary flex items-center justify-center">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                i <= stepIndex ? 'bg-accent w-8' : 'bg-border w-4'
              }`}
            />
          ))}
        </div>

        <div className="bg-bg-secondary border border-border rounded-2xl p-8">
          {step === 'welcome' && <WelcomeStep onNext={next} />}
          {step === 'x-api' && <XApiStep onNext={next} onPrev={prev} />}
          {step === 'claude-api' && <ClaudeApiStep onNext={next} onPrev={prev} />}
          {step === 'done' && <DoneStep onComplete={onComplete} />}
        </div>
      </div>
    </div>
  )
}

function WelcomeStep({ onNext }: { onNext: () => void }): JSX.Element {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
        <Zap size={32} className="text-accent" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Welcome to ThreadForge</h1>
      <p className="text-text-secondary mb-8 leading-relaxed">
        Compose, edit, and schedule X threads with AI-powered generation
        from prompts, documents, archives, and audio/video.
      </p>
      <div className="space-y-3 text-left mb-8">
        <Feature icon={<Twitter size={16} />} text="Post threads directly to X" />
        <Feature icon={<Sparkles size={16} />} text="Generate threads with Claude AI from any source" />
        <Feature icon={<Rocket size={16} />} text="Schedule threads for the perfect time" />
      </div>
      <Button className="w-full" onClick={onNext}>
        Get Started
        <ArrowRight size={16} className="ml-2" />
      </Button>
    </div>
  )
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }): JSX.Element {
  return (
    <div className="flex items-center gap-3 text-sm text-text-secondary">
      <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-accent flex-shrink-0">
        {icon}
      </div>
      {text}
    </div>
  )
}

function XApiStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }): JSX.Element {
  const [appKey, setAppKey] = useState('')
  const [appSecret, setAppSecret] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [accessSecret, setAccessSecret] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const hasCreds = appKey && appSecret && accessToken && accessSecret

  const handleTest = async () => {
    setTesting(true)
    setResult(null)
    await Promise.all([
      window.api.setSetting('x_app_key', appKey),
      window.api.setSetting('x_app_secret', appSecret),
      window.api.setSetting('x_access_token', accessToken),
      window.api.setSetting('x_access_secret', accessSecret)
    ])
    const res = await window.api.testXConnection()
    setResult({
      success: res.success,
      message: res.success ? `Connected as @${res.username}` : res.error || 'Failed'
    })
    setTesting(false)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-bg-tertiary flex items-center justify-center">
          <Twitter size={20} className="text-text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">X API Credentials</h2>
          <p className="text-xs text-text-muted">Required to post threads</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <Input label="API Key (Consumer Key)" value={appKey} onChange={setAppKey} placeholder="xxxxxxxxxxxxxxxxxxxxxxxx" />
        <Input label="API Secret" value={appSecret} onChange={setAppSecret} placeholder="xxxxxxxxxxxxxxxxxxxxxxxx" />
        <Input label="Access Token" value={accessToken} onChange={setAccessToken} placeholder="xxxxxxxxxxxxxxxxxxxxxxxx" />
        <Input label="Access Token Secret" value={accessSecret} onChange={setAccessSecret} placeholder="xxxxxxxxxxxxxxxxxxxxxxxx" />
      </div>

      {result && (
        <div className={`flex items-center gap-2 text-sm mb-4 ${result.success ? 'text-success' : 'text-danger'}`}>
          {result.success ? <Check size={14} /> : <X size={14} />}
          {result.message}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onPrev}>
          <ArrowLeft size={16} className="mr-1" />
          Back
        </Button>
        <div className="flex-1" />
        {hasCreds && !result?.success && (
          <Button variant="secondary" onClick={handleTest} disabled={testing}>
            {testing ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
            Test
          </Button>
        )}
        <Button onClick={onNext}>
          {result?.success ? 'Next' : 'Skip'}
          <ArrowRight size={16} className="ml-1" />
        </Button>
      </div>
    </div>
  )
}

function ClaudeApiStep({ onNext, onPrev }: { onNext: () => void; onPrev: () => void }): JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTest = async () => {
    setTesting(true)
    setResult(null)
    if (apiKey) {
      await window.api.setSetting('anthropic_api_key', apiKey)
    }
    const res = await window.api.testAIConnection()
    setResult({
      success: res.success,
      message: res.success ? `Connected (${res.model})` : res.error || 'Failed'
    })
    setTesting(false)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Sparkles size={20} className="text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Claude AI</h2>
          <p className="text-xs text-text-muted">Powers thread generation</p>
        </div>
      </div>

      <div className="bg-bg-tertiary rounded-lg p-3 text-xs text-text-secondary mb-4">
        If you have <code className="text-accent">ANTHROPIC_API_KEY</code> set in your environment,
        you can leave this blank — the app will use it automatically.
      </div>

      <div className="space-y-3 mb-4">
        <Input label="API Key (optional)" value={apiKey} onChange={setApiKey} placeholder="sk-ant-api03-..." />
      </div>

      {result && (
        <div className={`flex items-center gap-2 text-sm mb-4 ${result.success ? 'text-success' : 'text-danger'}`}>
          {result.success ? <Check size={14} /> : <X size={14} />}
          {result.message}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" onClick={onPrev}>
          <ArrowLeft size={16} className="mr-1" />
          Back
        </Button>
        <div className="flex-1" />
        <Button variant="secondary" onClick={handleTest} disabled={testing}>
          {testing ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
          Test
        </Button>
        <Button onClick={onNext}>
          {result?.success ? 'Next' : 'Skip'}
          <ArrowRight size={16} className="ml-1" />
        </Button>
      </div>
    </div>
  )
}

function DoneStep({ onComplete }: { onComplete: () => void }): JSX.Element {
  const handleFinish = async () => {
    await window.api.completeSetup()
    onComplete()
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
        <Check size={32} className="text-success" />
      </div>
      <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
      <p className="text-text-secondary mb-8">
        You can always update your credentials in Settings later.
      </p>
      <Button className="w-full" onClick={handleFinish}>
        <Rocket size={16} className="mr-2" />
        Launch ThreadForge
      </Button>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}): JSX.Element {
  return (
    <div>
      <label className="text-xs text-text-muted block mb-1">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-tertiary border border-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-accent placeholder:text-text-muted"
      />
    </div>
  )
}
