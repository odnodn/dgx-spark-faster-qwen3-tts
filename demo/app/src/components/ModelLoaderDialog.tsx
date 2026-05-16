import { useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useStore } from '@/store'
import { loadModel, fetchStatus } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { TtsMode } from '@/store'

const ALL_MODE_MODELS: Record<TtsMode, Array<{ id: string; name: string; sub: string }>> = {
  voice_clone: [
    { id: 'Qwen/Qwen3-TTS-12Hz-0.6B-Base', name: '0.6B Base', sub: 'Fastest \u00b7 RTF ~4\u00d7' },
    { id: 'Qwen/Qwen3-TTS-12Hz-1.7B-Base', name: '1.7B Base', sub: 'Higher quality \u00b7 RTF ~3.5\u00d7' },
  ],
  custom: [
    { id: 'Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice', name: '0.6B CustomVoice', sub: 'Fastest' },
    { id: 'Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice', name: '1.7B CustomVoice', sub: 'Higher quality' },
  ],
  voice_design: [
    { id: 'Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign', name: '1.7B VoiceDesign', sub: 'Describe any voice' },
  ],
}

const MODE_LABELS: Record<TtsMode, string> = {
  voice_clone: 'Clone',
  custom: 'Custom',
  voice_design: 'Voice Design',
}

interface ModelLoaderDialogProps {
  open: boolean
  mode: TtsMode
  onClose: () => void
  availableModels: string[]
}

export function ModelLoaderDialog({ open, mode, onClose, availableModels }: ModelLoaderDialogProps) {
  const { setLoadedModel, setLoadingModel, setModelStatus, setModelStatusText, setSelectedModel, setNonStreamingMode, setSpeakers, setPresetRefs } = useStore()
  const allModels = ALL_MODE_MODELS[mode] || []
  const models = availableModels.length > 0 ? allModels.filter(m => availableModels.includes(m.id)) : allModels
  const [selected, setSelected] = useState(models[0]?.id || '')
  const [loading, setLoading] = useState(false)

  async function handleLoad() {
    if (!selected) return
    setLoading(true)
    onClose()
    setSelectedModel(selected)
    setLoadingModel(selected)
    setModelStatus('loading')
    setModelStatusText('loading...')
    try {
      const res = await loadModel(selected)
      if (res.status === 'loaded' || res.status === 'already_loaded') {
        setLoadedModel(selected)
        setModelStatus('loaded')
        setModelStatusText('ready')
        if (selected.includes('CustomVoice') || selected.includes('VoiceDesign')) setNonStreamingMode(true)
        const d = await fetchStatus()
        setSpeakers(Array.isArray(d.speakers) ? d.speakers : Object.keys(d.speakers || {}))
        setPresetRefs(d.preset_refs || [])
      } else {
        setModelStatus('error')
        setModelStatusText('failed')
      }
    } catch {
      setModelStatus('error')
      setModelStatusText('error')
    } finally {
      setLoadingModel(null)
      setLoading(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={v => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-[460px] max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 border-t-2 border-t-violet-500 rounded-2xl p-5 shadow-[0_0_40px_rgba(139,92,246,0.2),0_20px_60px_rgba(0,0,0,0.5)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center mb-3">
            <button onClick={onClose} className="text-[11px] font-mono text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors flex items-center gap-1">
              &#9664; BACK
            </button>
            <div className="flex-1 text-center text-xs font-bold font-mono tracking-widest text-violet-400" style={{ textShadow: '0 0 8px rgba(139,92,246,0.6)' }}>
              &#11041; {MODE_LABELS[mode]} &#11041;
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {models.map(m => (
              <button
                key={m.id}
                onClick={() => setSelected(m.id)}
                className={cn(
                  'border rounded-md p-3 text-left transition-all',
                  selected === m.id
                    ? 'border-violet-500 bg-violet-500/10 shadow-[0_0_8px_rgba(139,92,246,0.35)]'
                    : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:border-violet-500/40 hover:bg-violet-500/5'
                )}
              >
                <div className={cn('text-sm font-semibold', selected === m.id ? 'text-violet-400' : 'text-zinc-900 dark:text-zinc-100')}>
                  {m.name}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-0.5">{m.sub}</div>
              </button>
            ))}
          </div>

          <button
            onClick={handleLoad}
            disabled={!selected || loading}
            className="w-full py-2.5 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold tracking-widest font-mono disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            LOAD &#9654;
          </button>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
