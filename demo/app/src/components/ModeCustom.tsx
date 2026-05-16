import { useState } from 'react'
import { Play } from 'lucide-react'
import { useStore } from '@/store'
import { ModelLoaderDialog } from './ModelLoaderDialog'
import { cn } from '@/lib/utils'

const DEFAULT_SPEAKERS = [
  { id: 'Aiden', desc: 'English \u2014 Sunny American male' },
  { id: 'Ryan', desc: 'English \u2014 Dynamic male' },
  { id: 'Vivian', desc: 'Chinese \u2014 Bright young female' },
  { id: 'Serena', desc: 'Chinese \u2014 Warm gentle female' },
  { id: 'Uncle_Fu', desc: 'Chinese \u2014 Seasoned low male' },
  { id: 'Dylan', desc: 'Chinese \u2014 Youthful Beijing male' },
  { id: 'Eric', desc: 'Chinese (Sichuan) \u2014 Lively male' },
  { id: 'Ono_Anna', desc: 'Japanese \u2014 Playful female' },
  { id: 'Sohee', desc: 'Korean \u2014 Warm female' },
]

export function ModeCustom({ onGenerate }: { onGenerate: () => void }) {
  const {
    loadedModel, loadingModel, busy,
    speakers, selectedSpeaker, setSelectedSpeaker,
    customInstr, setCustomInstr,
    availableModels,
  } = useStore()

  const [loaderOpen, setLoaderOpen] = useState(false)

  const isActive = !!loadedModel && loadedModel.includes('CustomVoice') && !loadingModel
  const isLoading = !!(loadingModel && loadingModel.includes('CustomVoice'))

  const speakerList = speakers.length > 0 ? speakers : DEFAULT_SPEAKERS.map(s => s.id)
  const getLabel = (id: string) => {
    const info = DEFAULT_SPEAKERS.find(s => s.id.toLowerCase() === id.toLowerCase())
    return info ? `${info.id} \u2014 ${info.desc}` : id
  }

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
          Custom &mdash; use a built-in speaker
          {!isActive && !isLoading && (
            <span className="inline-flex items-center text-[9px] font-mono font-bold tracking-widest text-violet-400 px-1 border border-violet-500/30 rounded bg-violet-500/10">
              LOAD &#9654;
            </span>
          )}
          <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700" />
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={selectedSpeaker}
            onChange={e => setSelectedSpeaker(e.target.value)}
            className="flex-1 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          >
            {speakerList.map(id => (
              <option key={id} value={id}>{getLabel(id)}</option>
            ))}
          </select>
          <button
            onClick={onGenerate}
            disabled={busy}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Play className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
        <div className="mt-1.5">
          <textarea
            value={customInstr}
            onChange={e => setCustomInstr(e.target.value)}
            placeholder="Voice style instructions (optional)…"
            className="w-full px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none"
            rows={1}
          />
        </div>
      </div>

      <ModelLoaderDialog
        open={loaderOpen}
        mode="custom"
        onClose={() => setLoaderOpen(false)}
        availableModels={availableModels}
      />
    </>
  )
}
