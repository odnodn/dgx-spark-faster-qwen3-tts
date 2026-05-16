import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { loadModel, fetchStatus } from '@/lib/api'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet'
import { Slider } from './ui/slider'
import { cn } from '@/lib/utils'

const ALL_MODEL_IDS = [
  { id: 'Qwen/Qwen3-TTS-12Hz-0.6B-Base', name: '0.6B Base' },
  { id: 'Qwen/Qwen3-TTS-12Hz-1.7B-Base', name: '1.7B Base' },
  { id: 'Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice', name: '0.6B CustomVoice' },
  { id: 'Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice', name: '1.7B CustomVoice' },
  { id: 'Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign', name: '1.7B VoiceDesign' },
]

export function SettingsPanel() {
  const {
    settingsOpen, setSettingsOpen,
    selectedModel, setSelectedModel,
    availableModels, loadedModel, setLoadedModel, setLoadingModel,
    setModelStatus, setModelStatusText, setNonStreamingMode,
    language, setLanguage,
    genMode, setGenMode,
    chunkSize, setChunkSize,
    nonStreamingMode,
    temperature, setTemperature,
    topK, setTopK,
    repPenalty, setRepPenalty,
    micDeviceId, setMicDeviceId,
    apiHost, setApiHost,
    apiPort, setApiPort,
    setSpeakers, setPresetRefs,
  } = useStore()

  const [loading, setLoading] = useState(false)
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    async function enumerateMics() {
      if (!navigator.mediaDevices?.enumerateDevices) return
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const inputs = devices.filter(d => d.kind === 'audioinput')
        setMicDevices(inputs)
        if (!micDeviceId && inputs.length > 0) {
          const def = inputs.find(d => d.deviceId === 'default' || d.label.toLowerCase().includes('default'))
          setMicDeviceId(def?.deviceId || inputs[0].deviceId)
        }
      } catch {}
    }
    if (settingsOpen) enumerateMics()
  }, [settingsOpen, micDeviceId, setMicDeviceId])

  async function handleLoad() {
    if (!selectedModel) return
    setLoading(true)
    setLoadingModel(selectedModel)
    setModelStatus('loading')
    setModelStatusText('loading...')
    try {
      const res = await loadModel(selectedModel)
      if (res.status === 'loaded' || res.status === 'already_loaded') {
        setLoadedModel(selectedModel)
        setModelStatus('loaded')
        setModelStatusText('ready')
        if (selectedModel.includes('CustomVoice') || selectedModel.includes('VoiceDesign')) setNonStreamingMode(true)
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

  const availableModelOptions = ALL_MODEL_IDS.filter(
    m => availableModels.length === 0 || availableModels.includes(m.id)
  )

  return (
    <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
      <SheetContent side="right" className="w-80 overflow-y-auto p-0 bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col h-full">
          <SheetHeader className="px-4 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <SheetTitle className="text-zinc-900 dark:text-zinc-100">Settings</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            <SectionLabel>Model</SectionLabel>
            <div className="flex gap-2">
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="flex-1 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {availableModelOptions.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <button
                onClick={handleLoad}
                disabled={loading || !selectedModel}
                className="px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Loading\u2026' : 'Load'}
              </button>
            </div>
            {loadedModel && (
              <p className="text-[11px] text-zinc-500 -mt-2">Loaded: <span className="text-zinc-400">{loadedModel.split('/').pop()}</span></p>
            )}

            <SectionLabel>Generation</SectionLabel>
            <SettingsRow label="Language">
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="flex-1 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {['English', 'Chinese', 'French', 'German', 'Spanish', 'Auto'].map(l => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </SettingsRow>
            <SettingsRow label="Mode">
              <Toggle
                options={[{ value: 'stream', label: 'Streaming' }, { value: 'non', label: 'Non-streaming' }]}
                value={genMode}
                onChange={v => setGenMode(v as 'stream' | 'non')}
              />
            </SettingsRow>
            {genMode === 'stream' && (
              <SettingsRow label="Chunk size">
                <SliderWithVal
                  min={1} max={24} step={1} value={chunkSize}
                  onChange={setChunkSize}
                  format={v => String(v)}
                />
              </SettingsRow>
            )}
            <SettingsRow label="Text feed">
              <Toggle
                options={[{ value: '0', label: 'Step-by-step' }, { value: '1', label: 'Prefill text' }]}
                value={nonStreamingMode ? '1' : '0'}
                onChange={v => setNonStreamingMode(v === '1')}
              />
            </SettingsRow>

            <SectionLabel>Sampling</SectionLabel>
            <SettingsRow label="Temperature">
              <SliderWithVal min={0.1} max={2.0} step={0.05} value={temperature} onChange={setTemperature} format={v => v.toFixed(2)} />
            </SettingsRow>
            <SettingsRow label="Top-K">
              <SliderWithVal min={1} max={100} step={1} value={topK} onChange={setTopK} format={v => String(v)} />
            </SettingsRow>
            <SettingsRow label="Rep. penalty">
              <SliderWithVal min={1.0} max={1.5} step={0.01} value={repPenalty} onChange={setRepPenalty} format={v => v.toFixed(2)} />
            </SettingsRow>

            <SectionLabel>Recording</SectionLabel>
            <SettingsRow label="Microphone">
              <select
                value={micDeviceId}
                onChange={e => setMicDeviceId(e.target.value)}
                className="flex-1 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {micDevices.length === 0 && <option value="">Default microphone</option>}
                {micDevices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${i + 1}`}
                  </option>
                ))}
              </select>
            </SettingsRow>

            <SectionLabel>API Endpoint</SectionLabel>
            <SettingsRow label="Host / IP">
              <input
                value={apiHost}
                onChange={e => setApiHost(e.target.value)}
                placeholder="localhost"
                className="flex-1 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </SettingsRow>
            <SettingsRow label="Port">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={65535}
                value={apiPort}
                onChange={e => setApiPort(e.target.value)}
                placeholder="8020"
                className="flex-1 h-8 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </SettingsRow>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-3 mt-1">
      {children}
    </h3>
  )
}

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-zinc-600 dark:text-zinc-400 min-w-[90px] flex-shrink-0">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-md p-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 px-2 py-1 text-[11px] font-medium rounded transition-all',
            value === opt.value
              ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SliderWithVal({ min, max, step, value, onChange, format }: {
  min: number; max: number; step: number; value: number
  onChange: (v: number) => void; format: (v: number) => string
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <Slider
        min={min} max={max} step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <span className="text-[11px] font-mono text-zinc-400 min-w-[32px] text-right">{format(value)}</span>
    </div>
  )
}
