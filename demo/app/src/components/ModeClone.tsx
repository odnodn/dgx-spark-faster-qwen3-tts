import { useRef, useState } from 'react'
import { Paperclip, Mic, Play } from 'lucide-react'
import { useStore } from '@/store'
import { fetchPresetRef, transcribeAudio } from '@/lib/api'
import { bufToWav } from '@/lib/audio'
import { ModelLoaderDialog } from './ModelLoaderDialog'
import { cn } from '@/lib/utils'

const REC_SR = 24000

export function ModeClone({ onGenerate }: { onGenerate: () => void }) {
  const {
    loadedModel, loadingModel, busy,
    refLabel, setRefLabel, refFile, setRefFile, refText, setRefText,
    xvecOnly, setXvecOnly, presetRefs, presetRefId, setPresetRefId,
    recPreviewUrl, setRecPreviewUrl,
    availableModels, showMsg,
    micDeviceId,
  } = useStore()

  const fileRef = useRef<HTMLInputElement>(null)
  const [loaderOpen, setLoaderOpen] = useState(false)

  const [recActive, setRecActive] = useState(false)
  const [recTime, setRecTime] = useState('')
  const [recStatus, setRecStatus] = useState('')
  const [recLevel, setRecLevel] = useState(0)
  const recStreamRef = useRef<MediaStream | null>(null)
  const recCtxRef = useRef<AudioContext | null>(null)
  const recChunksRef = useRef<Float32Array[]>([])
  const recActiveRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const isActive = !!loadedModel && !loadedModel.includes('VoiceDesign') && !loadedModel.includes('CustomVoice') && !loadingModel
  const isLoading = !!(loadingModel && (!loadedModel || loadedModel.includes('CustomVoice') || loadedModel.includes('VoiceDesign')))

  function onRowClick() {
    if (!isActive && !isLoading) setLoaderOpen(true)
  }

  async function pickRef(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setPresetRefId(null)
    setRefFile(f)
    setRefLabel(f.name)
    const url = URL.createObjectURL(f)
    setRecPreviewUrl(url)
    if (!xvecOnly) {
      try {
        setRefText('')
        const res = await transcribeAudio(f)
        setRefText(res.text || '')
      } catch {}
    }
    e.target.value = ''
  }

  async function selectPreset(id: string) {
    try {
      const d = await fetchPresetRef(id)
      const bytes = Uint8Array.from(atob(d.audio_b64), c => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: 'audio/wav' })
      const file = new File([blob], d.filename || `${id}.wav`, { type: 'audio/wav' })
      setPresetRefId(id)
      setRefFile(null)
      setRefLabel(d.label || d.filename || 'Reference audio')
      if (recPreviewUrl) URL.revokeObjectURL(recPreviewUrl)
      setRecPreviewUrl(URL.createObjectURL(blob))
      setRefText(d.ref_text || '')
      setXvecOnly(false)
      void file
    } catch {
      showMsg('err', 'Failed to load preset audio.')
    }
  }

  async function toggleRec() {
    if (recActive) {
      await stopRec()
    } else {
      await startRec()
    }
  }

  async function startRec() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showMsg('err', 'Recording not supported. Use HTTPS or localhost.')
      return
    }
    recChunksRef.current = []
    recActiveRef.current = true
    setRecActive(true)
    setRecStatus('Starting mic\u2026')
    try {
      const constraints: MediaStreamConstraints = {
        audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      }
      if (micDeviceId) (constraints.audio as MediaTrackConstraints).deviceId = { exact: micDeviceId }
      recStreamRef.current = await navigator.mediaDevices.getUserMedia(constraints)
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ latencyHint: 'interactive' })
      recCtxRef.current = ctx
      if (ctx.state === 'suspended') await ctx.resume()
      const source = ctx.createMediaStreamSource(recStreamRef.current)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      const gain = ctx.createGain()
      gain.gain.value = 0.0001
      const proc = ctx.createScriptProcessor(4096, 1, 1)
      proc.onaudioprocess = (e) => {
        if (!recActiveRef.current) return
        const inp = e.inputBuffer.getChannelData(0)
        const copy = new Float32Array(inp.length)
        copy.set(inp)
        recChunksRef.current.push(copy)
      }
      source.connect(analyser)
      analyser.connect(proc)
      proc.connect(gain)
      gain.connect(ctx.destination)

      let signalTs: number | null = null
      let signalCount = 0
      const buf = new Uint8Array(analyser.fftSize)
      const tick = () => {
        if (!recActiveRef.current) return
        analyser.getByteTimeDomainData(buf)
        let peak = 0
        for (let i = 0; i < buf.length; i++) {
          const v = Math.abs(buf[i] - 128)
          if (v > peak) peak = v
        }
        const norm = Math.min(1, peak / 64)
        setRecLevel(norm)
        if (norm > 0.02) signalCount++
        else signalCount = 0
        if (!signalTs && signalCount >= 4) signalTs = performance.now()
        if (signalTs) {
          setRecStatus('Recording\u2026')
          const s = Math.floor((performance.now() - signalTs) / 1000)
          setRecTime(Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'))
        } else {
          setRecStatus('Waiting for signal\u2026')
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      showMsg('err', 'Mic failed: ' + msg)
      cleanupRec()
    }
  }

  async function stopRec() {
    recActiveRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setRecActive(false)
    setRecStatus('')
    setRecTime('')
    setRecLevel(0)
    const chunks = recChunksRef.current
    if (!chunks.length) { showMsg('err', 'No audio captured.'); cleanupRec(); return }
    try {
      const ctx = recCtxRef.current!
      const total = chunks.reduce((s, c) => s + c.length, 0)
      const buf = ctx.createBuffer(1, total, ctx.sampleRate)
      const ch = buf.getChannelData(0)
      let off = 0
      for (const c of chunks) { ch.set(c, off); off += c.length }

      const rawWav = bufToWav(buf)
      if (recPreviewUrl) URL.revokeObjectURL(recPreviewUrl)
      setRecPreviewUrl(URL.createObjectURL(rawWav))

      let out = buf
      if (buf.sampleRate !== REC_SR) {
        const len = Math.ceil(buf.duration * REC_SR)
        const offCtx = new OfflineAudioContext(1, len, REC_SR)
        const src = offCtx.createBufferSource()
        src.buffer = buf; src.connect(offCtx.destination); src.start(0)
        out = await offCtx.startRendering()
      }
      const wav = bufToWav(out)
      setPresetRefId(null)
      const file = new File([wav], 'recorded.wav', { type: 'audio/wav' })
      setRefFile(file)
      setRefLabel('recorded.wav')
      if (!xvecOnly) {
        try {
          const res = await transcribeAudio(file)
          setRefText(res.text || '')
        } catch {}
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      showMsg('err', 'Recording failed: ' + msg)
    }
    cleanupRec()
  }

  function cleanupRec() {
    recStreamRef.current?.getTracks().forEach(t => t.stop())
    recStreamRef.current = null
    recCtxRef.current?.close().catch(() => {})
    recCtxRef.current = null
    recActiveRef.current = false
  }

  const rowClass = cn(
    'rounded-md p-2 transition-all duration-200',
    isActive && 'mode-row-active',
    isLoading && 'mode-row-loading',
    !isActive && !isLoading && 'opacity-40 cursor-pointer hover:opacity-90 mode-row-inactive'
  )

  return (
    <>
      <div className={rowClass} onClick={!isActive && !isLoading ? onRowClick : undefined}>
        <div className={cn('flex items-center gap-2 text-[11px] mb-1.5', isActive ? 'text-violet-600 dark:text-violet-400 font-semibold' : 'text-zinc-500')}>
          {isActive && <span className="animate-blink-cursor">&#9654;</span>}
          {isLoading && <span className="animate-spin inline-block">&#9675;</span>}
          Clone &mdash; match a voice from a reference clip
          {!isActive && !isLoading && (
            <span className="inline-flex items-center text-[9px] font-mono font-bold tracking-widest text-violet-400 px-1 border border-violet-500/30 rounded bg-violet-500/10 animate-flicker-in">
              LOAD &#9654;
            </span>
          )}
          <div className="flex-1 h-px bg-zinc-700" />
        </div>

        <div className="mb-1.5">
          <div className="flex bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md p-0.5">
            <button onClick={() => setXvecOnly(true)} className={cn('flex-1 py-1 text-[11px] font-medium rounded transition-all', xvecOnly ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300')}>{`Simple`}</button>
            <button onClick={() => setXvecOnly(false)} className={cn('flex-1 py-1 text-[11px] font-medium rounded transition-all', !xvecOnly ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300')}>{`Advanced`}</button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <label className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 rounded-md cursor-pointer transition-all text-xs max-w-[200px]',
            refFile || presetRefId ? 'border border-violet-500/50 text-violet-600 dark:text-violet-400' : 'border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:border-violet-600 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400'
          )}>
            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{refLabel}</span>
            <input ref={fileRef} type="file" accept=".wav,.mp3,.flac,.ogg" className="hidden" onChange={pickRef} />
          </label>

          <button
            onClick={toggleRec}
            className={cn('w-8 h-8 flex items-center justify-center rounded-md border transition-all flex-shrink-0',
              recActive ? 'border-red-500 text-red-500 dark:text-red-400 animate-blink' : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 hover:border-violet-600 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400'
            )}
            title="Record from microphone"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>

          {recTime && <span className="text-[11px] font-mono text-red-400">{recTime}</span>}
          {recStatus && <span className="text-[11px] text-zinc-500">{recStatus}</span>}

          {presetRefs.map(p => (
            <button
              key={p.id}
              onClick={() => selectPreset(p.id)}
              className={cn('px-2.5 py-1.5 rounded-md text-xs border transition-all',
                presetRefId === p.id ? 'border-violet-500 bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-violet-600 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/5'
              )}
            >
              {p.label || p.id}
            </button>
          ))}

          <button
            onClick={onGenerate}
            disabled={busy}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex-shrink-0 ml-auto"
          >
            <Play className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>

        {recActive && (
          <div className="h-0.5 bg-zinc-200 dark:bg-zinc-800 rounded overflow-hidden mt-1.5">
            <div
              className="h-full rounded transition-all duration-75"
              style={{ width: `${recLevel * 100}%`, background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)' }}
            />
          </div>
        )}

        {recPreviewUrl && (
          <audio src={recPreviewUrl} controls className="w-full h-7 rounded mt-1.5 opacity-80" />
        )}

        {!xvecOnly && (
          <div className="mt-2">
            <p className="text-[11px] text-zinc-500 mb-1.5">Advanced cloning uses the transcript of the reference clip for higher accuracy.</p>
            <textarea
              value={refText}
              onChange={e => setRefText(e.target.value)}
              placeholder="Upload or record audio to auto-transcribe\u2026"
              className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-md text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 resize-none"
              rows={2}
            />
          </div>
        )}
      </div>

      <ModelLoaderDialog
        open={loaderOpen}
        mode="voice_clone"
        onClose={() => setLoaderOpen(false)}
        availableModels={availableModels}
      />
    </>
  )
}
