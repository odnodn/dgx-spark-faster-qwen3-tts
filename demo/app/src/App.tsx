import { useEffect } from 'react'
import { useStore } from './store'
import { Layout } from './components/Layout'
import { fetchStatus, loadModel } from './lib/api'

export default function App() {
  const {
    theme, setAvailableModels, setLoadedModel, setModelStatus, setModelStatusText,
    setSpeakers, setPresetRefs, setSelectedModel, setNonStreamingMode, setLoadingModel,
  } = useStore()

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  useEffect(() => {
    async function init() {
      try {
        const d = await fetchStatus()
        const available = d.available_models || []
        setAvailableModels(available)
        if (d.loaded && d.model) {
          setLoadedModel(d.model)
          setSelectedModel(d.model)
          setModelStatus('loaded')
          setModelStatusText('ready')
          const m = d.model
          if (m.includes('CustomVoice') || m.includes('VoiceDesign')) setNonStreamingMode(true)
        } else {
          setModelStatusText('not loaded')
          if (available.length > 0) {
            const preferred = available.find((m: string) => m.includes('CustomVoice')) || available[0]
            setSelectedModel(preferred)
          }
        }
        setSpeakers(Array.isArray(d.speakers) ? d.speakers : Object.keys(d.speakers || {}))
        setPresetRefs(d.preset_refs || [])

        if (!d.loaded && available.length > 0) {
          const preferred = available.find((m: string) => m.includes('CustomVoice')) || available[0]
          setLoadingModel(preferred)
          setModelStatus('loading')
          setModelStatusText('loading...')
          try {
            const res = await loadModel(preferred)
            if (res.status === 'loaded' || res.status === 'already_loaded') {
              setLoadedModel(preferred)
              setModelStatus('loaded')
              setModelStatusText('ready')
              if (preferred.includes('CustomVoice') || preferred.includes('VoiceDesign')) setNonStreamingMode(true)
              const d2 = await fetchStatus()
              setSpeakers(Array.isArray(d2.speakers) ? d2.speakers : Object.keys(d2.speakers || {}))
              setPresetRefs(d2.preset_refs || [])
            } else {
              setModelStatus('error')
              setModelStatusText('failed')
            }
          } catch {
            setModelStatus('error')
            setModelStatusText('error')
          } finally {
            setLoadingModel(null)
          }
        }
      } catch {
        setModelStatus('error')
        setModelStatusText('offline')
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <Layout />
}
