import { useEffect } from 'react'
import { useStore } from '@/store'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ModeClone } from './ModeClone'
import { ModeCustom } from './ModeCustom'
import { ModeVoiceDesign } from './ModeVoiceDesign'
import { AudioResults } from './AudioResults'
import { MessageBar } from './MessageBar'
import { SettingsPanel } from './SettingsPanel'
import { useGenerate } from '@/hooks/useGenerate'
import { Textarea } from './ui/textarea'

export function Layout() {
  const { text, setText } = useStore()
  const { generate } = useGenerate()

  useEffect(() => {
    const handler = (e: Event) => {
      const mode = (e as CustomEvent).detail?.mode
      if (mode) generate(mode)
    }
    window.addEventListener('tts:generate', handler)
    return () => window.removeEventListener('tts:generate', handler)
  }, [generate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        const { refFile, presetRefId, selectedSpeaker, activeMode } = useStore.getState()
        const mode = activeMode || (refFile || presetRefId ? 'voice_clone' : selectedSpeaker ? 'custom' : 'voice_design')
        generate(mode)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [generate])

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Enter text to synthesize..."
              className="h-[100px] text-sm"
            />

            <ModeClone onGenerate={() => generate('voice_clone')} />
            <ModeCustom onGenerate={() => generate('custom')} />
            <ModeVoiceDesign onGenerate={() => generate('voice_design')} />

            <MessageBar />

            <AudioResults />
          </div>
        </main>
      </div>
      <SettingsPanel />
    </div>
  )
}
