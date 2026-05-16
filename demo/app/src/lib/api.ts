import { useStore } from '@/store'

const MIN_API_PORT = 1
const MAX_API_PORT = 65535
const DEFAULT_API_PORT = 8020

export interface StatusResponse {
  loaded: boolean
  model: string | null
  available_models: string[]
  speakers: string[] | Record<string, string>
  preset_refs: Array<{ id: string; label?: string }>
}

export interface LoadResponse {
  status: 'loaded' | 'already_loaded' | 'error'
}

export interface PresetRefResponse {
  audio_b64: string
  filename: string
  label: string
  ref_text: string
}

export interface StreamChunk {
  type: 'queued' | 'chunk' | 'done' | 'error'
  position?: number
  audio_b64?: string
  sample_rate?: number
  elapsed_ms?: number
  ttfa_ms?: number
  rtf?: number
  total_audio_s?: number
  voice_clone_ms?: number
  message?: string
}

export interface NonStreamResponse {
  audio_b64: string
  metrics: {
    total_ms: number
    rtf: number
    audio_duration_s: number
    voice_clone_ms?: number
  }
}

export interface TranscribeResponse {
  text: string
}

function buildApiUrl(path: string): string {
  const { apiHost, apiPort } = useStore.getState()
  const host = apiHost || 'localhost'
  const port = normalizePort(apiPort)
  return `http://${host}:${port}${path}`
}

function normalizePort(rawPort: string): number {
  const parsedPort = Number.parseInt(rawPort, 10)
  return !Number.isNaN(parsedPort) && parsedPort >= MIN_API_PORT && parsedPort <= MAX_API_PORT
    ? parsedPort
    : DEFAULT_API_PORT
}

export async function fetchStatus(): Promise<StatusResponse> {
  const r = await fetch(buildApiUrl('/status'))
  if (!r.ok) throw new Error('Status fetch failed')
  return r.json()
}

export async function loadModel(modelId: string): Promise<LoadResponse> {
  const fd = new FormData()
  fd.append('model_id', modelId)
  const r = await fetch(buildApiUrl('/load'), { method: 'POST', body: fd })
  if (!r.ok) throw new Error('Load failed')
  return r.json()
}

export async function transcribeAudio(audio: File): Promise<TranscribeResponse> {
  const fd = new FormData()
  fd.append('audio', audio)
  const r = await fetch(buildApiUrl('/transcribe'), { method: 'POST', body: fd })
  if (!r.ok) throw new Error('Transcribe failed')
  return r.json()
}

export async function fetchPresetRef(id: string): Promise<PresetRefResponse> {
  const r = await fetch(buildApiUrl(`/preset_ref/${id}`))
  if (!r.ok) throw new Error('Preset fetch failed')
  return r.json()
}

export async function* streamGenerate(fd: FormData): AsyncGenerator<StreamChunk> {
  const res = await fetch(buildApiUrl('/generate/stream'), { method: 'POST', body: fd })
  if (!res.ok) {
    const e = await res.json()
    throw new Error(e.detail || 'Request failed')
  }
  const reader = res.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop()!
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      yield JSON.parse(line.slice(6))
    }
  }
}

export async function nonStreamGenerate(fd: FormData): Promise<NonStreamResponse> {
  const res = await fetch(buildApiUrl('/generate'), { method: 'POST', body: fd })
  if (!res.ok) {
    const e = await res.json()
    throw new Error(e.detail || 'Request failed')
  }
  return res.json()
}
