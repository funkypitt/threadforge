import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/renderer/src/**/*.{ts,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0a',
          secondary: '#141414',
          tertiary: '#1a1a1a',
          hover: '#1f1f1f'
        },
        border: {
          DEFAULT: '#2a2a2a',
          hover: '#3a3a3a'
        },
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          muted: '#1d4ed8'
        },
        text: {
          primary: '#f5f5f5',
          secondary: '#a3a3a3',
          muted: '#737373'
        },
        success: '#22c55e',
        warning: '#eab308',
        danger: '#ef4444'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    }
  },
  plugins: []
}

export default config
