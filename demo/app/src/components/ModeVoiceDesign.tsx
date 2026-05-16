import { useState } from 'react'
import { Play } from 'lucide-react'
import { useStore } from '@/store'
import { ModelLoaderDialog } from './ModelLoaderDialog'
import { cn } from '@/lib/utils'

export function ModeVoiceDesign({ onGenerate }: { onGenerate: () => void }) {
  const { loadedModel, loadingModel, busy, voiceInstr, setVoiceInstr, availableModels } = useStore()
  const [loaderOpen, setLoaderOpen] = useState(false)

  const isActive = !!loadedModel && loadedModel.includes('VoiceDesign') && !loadingModel
  const isLoading = !!(loadingModel && loadingModel.includes('VoiceDesign'))

  function onRowClick() {
    if (!isActive && !isLoading) setLoaderOpen(true)
  }

  const rowClass = cn(
    'rounded-md p-2 transition-all duration-200',
    isActive && 'mode-row-active',
    isLoading && 'mode-row-loading',
    !isActive && !isLoading && 'opacity-40 cursor-pointer hover:opacity-90 hover:shadow-[0_0_0_1px_#3f3f46,0_0_10px_rgba(139,92,246,0.2)]'
  )

  return (
    <>
      <div className={rowClass} onClick={!isActive && !isLoading ? onRowClick : undefined}>
        <div className={cn('flex items-center gap-2 text-[11px] mb-1.5', isActive ? 'text-violet-400 font-semibold' : 'text-zinc-500')}>
          {isActive && <span className="animate-blink-cursor">&#9654;</span>}
          {isLoading && <span className="animate-spin inline-block">&#9675;</span>}
          Voice Design &mdash; describe any voice
          {!isActive && !isLoading && (
            <span className="inline-flex items-center text-[9px] font-mono font-bold tracking-widest text-violet-400 px-1 border border-violet-500/30 rounded bg-violet-500/10">
              LOAD &#9654;
            </span>
          )}
          <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700" />
        </div>
        <div className="flex items-center gap-1.5">
          <textarea
            value={voiceInstr}
            onChange={e => setVoiceInstr(e.target.value)}
            placeholder="e.g. warm, calm female narrator…"
            className="flex-1 px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none"
            rows={1}
          />
          <button
            onClick={onGenerate}
            disabled={busy}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Play className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>

      <ModelLoaderDialog
        open={loaderOpen}
        mode="voice_design"
        onClose={() => setLoaderOpen(false)}
        availableModels={availableModels}
      />
    </>
  )
}
