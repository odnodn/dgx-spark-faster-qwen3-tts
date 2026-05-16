import { Sun, Moon, Settings } from 'lucide-react'
import { useStore } from '@/store'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

export function Header() {
  const { theme, toggleTheme, modelStatus, modelStatusText, setSettingsOpen } = useStore()

  const dotClass = {
    off: 'bg-zinc-500',
    loading: 'bg-amber-400 animate-blink',
    loaded: 'bg-green-500',
    error: 'bg-red-500',
  }[modelStatus]

  return (
    <header className="flex items-center gap-2 px-4 h-11 border-b border-zinc-800 flex-shrink-0 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
      <h1 className="text-sm font-semibold tracking-tight">faster-qwen3-tts</h1>
      <Badge>CUDA GRAPHS</Badge>
      <div className="flex-1" />
      <button
        onClick={() => setSettingsOpen(true)}
        className="flex items-center gap-1.5 text-[11px] text-zinc-500 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full hover:border-zinc-700 transition-colors cursor-pointer"
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${dotClass}`} />
        <span>{modelStatusText}</span>
      </button>
      <Button variant="icon" size="icon" onClick={() => setSettingsOpen(true)} title="Settings">
        <Settings className="h-[15px] w-[15px]" />
      </Button>
      <Button variant="icon" size="icon" onClick={toggleTheme} title="Toggle theme">
        {theme === 'dark' ? <Sun className="h-[15px] w-[15px]" /> : <Moon className="h-[15px] w-[15px]" />}
      </Button>
    </header>
  )
}
