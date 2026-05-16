import { useRef } from 'react'
import { useStore } from '@/store'
import type { TtsMode } from '@/store'
import { streamGenerate, nonStreamGenerate } from '@/lib/api'
import { AudioEngine } from '@/lib/audio'

const audioEngine = new AudioEngine()

export function useGenerate() {
  const clientT0Ref = useRef(0)
  const store = useStore()

  async function generate(mode: TtsMode) {
    const { busy, loadedModel, refFile, presetRefId, selectedSpeaker, text, language,
      temperature, topK, repPenalty, nonStreamingMode, chunkSize, xvecOnly, refText,
      customInstr, voiceInstr, genMode,
      setBusy, setGenerating, setProgressDone, setStreaming, setAudioUrl, setDlBlob,
      setMetrics, updateMetrics, setQueuePosition, showMsg, hideMsg,
    } = store

    if (busy) return

    const isVD = loadedModel?.includes('VoiceDesign')
    const isCV = loadedModel?.includes('CustomVoice')
    if (mode === 'voice_design' && loadedModel && !isVD) {
      showMsg('warn', 'Voice design requires the 1.7B-VoiceDesign model.', 'Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign', mode)
      return
    }
    if (mode === 'custom' && loadedModel && !isCV) {
      showMsg('warn', 'Custom speaker requires a CustomVoice model.', 'Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice', mode)
      return
    }
    if (mode === 'voice_clone' && loadedModel && (isVD || isCV)) {
      showMsg('warn', 'Voice clone needs a Base model.', 'Qwen/Qwen3-TTS-12Hz-0.6B-Base', mode)
      return
    }
    if (mode === 'voice_clone' && !refFile && !presetRefId) {
      showMsg('err', 'Add reference audio first.')
      return
    }
    if (mode === 'custom' && !selectedSpeaker) {
      showMsg('err', 'Select a speaker first.')
      return
    }
    hideMsg()
    setQueuePosition(null)
    setBusy(true)
    setGenerating(true)
    setProgressDone(false)
    setStreaming(false)
    setAudioUrl(null)
    setDlBlob(null)
    setMetrics({})

    const fd = new FormData()
    fd.append('text', text)
    fd.append('mode', mode)
    fd.append('language', language)
    fd.append('temperature', String(temperature))
    fd.append('top_k', String(topK))
    fd.append('repetition_penalty', String(repPenalty))
    fd.append('non_streaming_mode', nonStreamingMode ? 'true' : 'false')

    if (mode === 'voice_clone') {
      if (presetRefId) {
        fd.append('ref_preset', presetRefId)
      } else if (refFile) {
        fd.append('ref_audio', refFile)
      }
      fd.append('xvec_only', xvecOnly ? 'true' : 'false')
      if (!xvecOnly) fd.append('ref_text', refText)
    } else if (mode === 'custom') {
      fd.append('speaker', selectedSpeaker)
      fd.append('instruct', customInstr)
    } else {
      fd.append('instruct', voiceInstr)
    }

    try {
      if (genMode === 'stream') {
        fd.append('chunk_size', String(chunkSize))
        setStreaming(true)
        clientT0Ref.current = performance.now()
        let audioInited = false

        audioEngine.onFirstAudio = () => {
          updateMetrics({ client: performance.now() - clientT0Ref.current })
        }

        for await (const chunk of streamGenerate(fd)) {
          if (chunk.type === 'queued') {
            setQueuePosition(chunk.position ?? 1)
          } else if (chunk.type === 'chunk') {
            setQueuePosition(null)
            if (!audioInited) {
              await audioEngine.init(chunk.sample_rate)
              audioInited = true
            }
            updateMetrics({
              ttfa: chunk.ttfa_ms,
              rtf: chunk.rtf,
              dur: chunk.total_audio_s,
              clone: chunk.voice_clone_ms,
            })
            audioEngine.enqueueChunk(chunk.audio_b64!)
            setTimeout(() => updateMetrics({ buf: audioEngine.lastBufS }), 0)
          } else if (chunk.type === 'done') {
            setQueuePosition(null)
            updateMetrics({
              ttfa: chunk.ttfa_ms,
              rtf: chunk.rtf,
              dur: chunk.total_audio_s,
              clone: chunk.voice_clone_ms,
            })
            await audioEngine.waitChunks()
            setProgressDone(true)
            setStreaming(false)
            const blob = audioEngine.buildFinalWav()
            if (blob) {
              setDlBlob(blob)
              setAudioUrl(URL.createObjectURL(blob))
            }
          } else if (chunk.type === 'error') {
            throw new Error(chunk.message)
          }
        }
      } else {
        const d = await nonStreamGenerate(fd)
        const m = d.metrics
        setMetrics({
          ttfa: m.total_ms,
          rtf: m.rtf,
          dur: m.audio_duration_s,
          clone: m.voice_clone_ms,
        })
        setProgressDone(true)
        const bytes = Uint8Array.from(atob(d.audio_b64), c => c.charCodeAt(0))
        const blob = new Blob([bytes], { type: 'audio/wav' })
        setDlBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      showMsg('err', 'Generation failed: ' + msg)
      setProgressDone(false)
    } finally {
      setBusy(false)
      setGenerating(false)
    }
  }

  return { generate }
}
