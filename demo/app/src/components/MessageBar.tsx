import { useStore } from '@/store'
import { loadModel, fetchStatus } from '@/lib/api'
import type { TtsMode } from '@/store'

export function MessageBar() {
  const {
    msgType, msgText, msgSwitchModel, msgSwitchMode,
    hideMsg, setLoadedModel, setLoadingModel, setModelStatus, setModelStatusText,
    setSpeakers, setPresetRefs, busy, setBusy, setNonStreamingMode,
  } = useStore()

  if (!msgType) return null

  async function switchAndGen() {
    if (busy || !msgSwitchModel) return
    const mode = msgSwitchMode as TtsMode
    setBusy(true)
    hideMsg()
    setLoadingModel(msgSwitchModel)
    setModelStatus('loading')
    setModelStatusText('loading...')
    try {
      const res = await loadModel(msgSwitchModel)
      if (res.status === 'loaded' || res.status === 'already_loaded') {
        setLoadedModel(msgSwitchModel)
        setModelStatus('loaded')
        setModelStatusText('ready')
        if (msgSwitchModel.includes('CustomVoice') || msgSwitchModel.includes('VoiceDesign')) setNonStreamingMode(true)
        const d = await fetchStatus()
        setSpeakers(Array.isArray(d.speakers) ? d.speakers : Object.keys(d.speakers || {}))
        setPresetRefs(d.preset_refs || [])
      }
    } catch {
      setModelStatus('error')
      setModelStatusText('error')
    } finally {
      setLoadingModel(null)
      setBusy(false)
    }
    window.dispatchEvent(new CustomEvent('tts:generate', { detail: { mode } }))
  }

  const baseClass = msgType === 'err'
    ? 'bg-red-500/10 border border-red-500/20 text-red-300 dark:text-red-300'
    : 'bg-amber-500/10 border border-amber-500/20 text-amber-300 dark:text-amber-300'

  return (
    <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${baseClass}`}>
      <span className="flex-1">{msgText}</span>
      {msgSwitchModel && (
        <button
          onClick={switchAndGen}
          className="ml-auto px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/30 transition-colors whitespace-nowrap"
        >
          Load &amp; generate
        </button>
      )}
    </div>
  )
}
