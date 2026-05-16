import { Download } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'

export function AudioResults() {
  const { audioUrl, dlBlob, metrics, generating, progressDone, streaming, theme, queuePosition } = useStore()

  function dlAudio() {
    if (!dlBlob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(dlBlob)
    a.download = 'generated_speech.wav'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const showResults = audioUrl || generating

  return (
    <div className="flex flex-col gap-2">
      {queuePosition != null && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-zinc-400 bg-indigo-500/10 border border-indigo-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-blink flex-shrink-0" />
          {queuePosition === 1
            ? 'Waiting... (1 request ahead of you)'
            : `Waiting... (${queuePosition} requests ahead of you)`}
        </div>
      )}

      {generating && (
        <div className="h-0.5 bg-zinc-800 rounded overflow-hidden">
          <div
            className={cn(
              'h-full bg-violet-500 rounded transition-all',
              !progressDone ? 'pbar-sweep' : 'w-full'
            )}
          />
        </div>
      )}

      {showResults && (
        <div className="flex flex-col gap-2">
          {audioUrl && (
            <div className="flex items-center gap-2">
              <audio
                controls
                src={audioUrl}
                className={cn('flex-1 h-8 rounded', theme === 'dark' && '[filter:invert(0.88)_hue-rotate(180deg)]')}
              />
              <button
                onClick={dlAudio}
                className="w-7 h-7 flex items-center justify-center border border-zinc-700 rounded text-zinc-500 hover:border-violet-500 hover:text-violet-400 transition-colors flex-shrink-0"
                title="Download WAV"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2.5 flex-wrap px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-[11px]">
            <MetricItem label="TTFA" value={metrics.ttfa != null ? `${Math.round(metrics.ttfa)}ms` : undefined} />
            <MetricItem label="Client" value={metrics.client != null ? `${Math.round(metrics.client)}ms` : undefined} />
            {metrics.clone != null && <MetricItem label="Clone" value={`${Math.round(metrics.clone)}ms`} />}
            <MetricItem label="RTF" value={metrics.rtf != null ? `${metrics.rtf.toFixed(2)}x` : undefined} />
            <MetricItem label="Dur" value={metrics.dur != null ? `${metrics.dur.toFixed(1)}s` : undefined} />
            <MetricItem label="Buf" value={metrics.buf != null ? `${metrics.buf.toFixed(2)}s` : undefined} />
            {streaming && (
              <div className="flex items-center gap-0.5 h-3 ml-auto">
                {[3, 7, 11, 7, 3].map((h, i) => (
                  <span
                    key={i}
                    className="w-0.5 rounded-full bg-violet-500 block"
                    style={{ height: `${h}px`, animation: `wavebar 0.7s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-zinc-500 uppercase tracking-wide text-[10px]">{label}</span>
      <span className="font-mono font-semibold text-[12px] text-zinc-200">{value ?? '—'}</span>
    </div>
  )
}
