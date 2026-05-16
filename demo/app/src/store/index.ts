import { create } from 'zustand'

const DEFAULT_API_HOST = 'localhost'
const DEFAULT_API_PORT = '8020'

function readStorage(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    return
  }
}

export type TtsMode = 'voice_clone' | 'custom' | 'voice_design'
export type GenMode = 'stream' | 'non'
export type ModelStatus = 'off' | 'loading' | 'loaded' | 'error'

export interface PresetRef {
  id: string
  label?: string
}

export interface ModelInfo {
  id: string
  name: string
  sub: string
}

export interface Metrics {
  ttfa?: number
  client?: number
  rtf?: number
  dur?: number
  buf?: number
  clone?: number
}

export interface AppState {
  // Theme
  theme: 'dark' | 'light'
  toggleTheme: () => void
  setTheme: (t: 'dark' | 'light') => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void

  // Settings sheet
  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void

  // Text input
  text: string
  setText: (t: string) => void

  // Mode & status
  activeMode: TtsMode
  setActiveMode: (m: TtsMode) => void
  modelStatus: ModelStatus
  setModelStatus: (s: ModelStatus) => void
  modelStatusText: string
  setModelStatusText: (t: string) => void
  loadedModel: string | null
  setLoadedModel: (m: string | null) => void
  loadingModel: string | null
  setLoadingModel: (m: string | null) => void
  availableModels: string[]
  setAvailableModels: (m: string[]) => void

  // Settings
  selectedModel: string
  setSelectedModel: (m: string) => void
  language: string
  setLanguage: (l: string) => void
  genMode: GenMode
  setGenMode: (m: GenMode) => void
  chunkSize: number
  setChunkSize: (n: number) => void
  nonStreamingMode: boolean
  setNonStreamingMode: (v: boolean) => void
  temperature: number
  setTemperature: (n: number) => void
  topK: number
  setTopK: (n: number) => void
  repPenalty: number
  setRepPenalty: (n: number) => void
  micDeviceId: string
  setMicDeviceId: (id: string) => void
  apiHost: string
  setApiHost: (host: string) => void
  apiPort: string
  setApiPort: (port: string) => void

  // Clone mode
  refFile: File | null
  setRefFile: (f: File | null) => void
  refLabel: string
  setRefLabel: (l: string) => void
  refText: string
  setRefText: (t: string) => void
  xvecOnly: boolean
  setXvecOnly: (v: boolean) => void
  presetRefs: PresetRef[]
  setPresetRefs: (refs: PresetRef[]) => void
  presetRefId: string | null
  setPresetRefId: (id: string | null) => void
  recPreviewUrl: string | null
  setRecPreviewUrl: (url: string | null) => void

  // Custom mode
  speakers: string[]
  setSpeakers: (s: string[]) => void
  selectedSpeaker: string
  setSelectedSpeaker: (s: string) => void
  customInstr: string
  setCustomInstr: (t: string) => void

  // Voice design
  voiceInstr: string
  setVoiceInstr: (t: string) => void

  // Generation state
  busy: boolean
  setBusy: (v: boolean) => void
  queuePosition: number | null
  setQueuePosition: (n: number | null) => void

  // Progress
  generating: boolean
  setGenerating: (v: boolean) => void
  progressDone: boolean
  setProgressDone: (v: boolean) => void
  streaming: boolean
  setStreaming: (v: boolean) => void

  // Results
  audioUrl: string | null
  setAudioUrl: (url: string | null) => void
  dlBlob: Blob | null
  setDlBlob: (b: Blob | null) => void
  metrics: Metrics
  setMetrics: (m: Metrics) => void
  updateMetrics: (m: Partial<Metrics>) => void

  // Messages
  msgType: 'err' | 'warn' | null
  msgText: string
  msgSwitchModel: string | null
  msgSwitchMode: TtsMode | null
  showMsg: (type: 'err' | 'warn', text: string, switchModel?: string, switchMode?: TtsMode) => void
  hideMsg: () => void
}

export const useStore = create<AppState>((set, get) => ({
  // Theme
  theme: (localStorage.getItem('theme') as 'dark' | 'light') ||
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    set({ theme: next })
    localStorage.setItem('theme', next)
  },
  setTheme: (t) => {
    set({ theme: t })
    localStorage.setItem('theme', t)
  },

  // Sidebar
  sidebarOpen: true,
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  // Settings sheet
  settingsOpen: false,
  setSettingsOpen: (v) => set({ settingsOpen: v }),

  // Text
  text: 'Against the odds, the wild lobster has found a new vessel for its voice. And with it, the possibility to realise its full potential.',
  setText: (t) => set({ text: t }),

  // Mode & status
  activeMode: 'voice_clone',
  setActiveMode: (m) => set({ activeMode: m }),
  modelStatus: 'off',
  setModelStatus: (s) => set({ modelStatus: s }),
  modelStatusText: 'not loaded',
  setModelStatusText: (t) => set({ modelStatusText: t }),
  loadedModel: null,
  setLoadedModel: (m) => set({ loadedModel: m }),
  loadingModel: null,
  setLoadingModel: (m) => set({ loadingModel: m }),
  availableModels: [],
  setAvailableModels: (m) => set({ availableModels: m }),

  // Settings
  selectedModel: '',
  setSelectedModel: (m) => set({ selectedModel: m }),
  language: 'English',
  setLanguage: (l) => set({ language: l }),
  genMode: 'stream',
  setGenMode: (m) => set({ genMode: m }),
  chunkSize: 8,
  setChunkSize: (n) => set({ chunkSize: n }),
  nonStreamingMode: false,
  setNonStreamingMode: (v) => set({ nonStreamingMode: v }),
  temperature: 0.9,
  setTemperature: (n) => set({ temperature: n }),
  topK: 50,
  setTopK: (n) => set({ topK: n }),
  repPenalty: 1.05,
  setRepPenalty: (n) => set({ repPenalty: n }),
  micDeviceId: '',
  setMicDeviceId: (id) => set({ micDeviceId: id }),
  apiHost: readStorage('apiHost', DEFAULT_API_HOST),
  setApiHost: (host) => {
    const next = host.trim() || DEFAULT_API_HOST
    set({ apiHost: next })
    writeStorage('apiHost', next)
  },
  apiPort: readStorage('apiPort', DEFAULT_API_PORT),
  setApiPort: (port) => {
    const next = port.trim() || DEFAULT_API_PORT
    set({ apiPort: next })
    writeStorage('apiPort', next)
  },

  // Clone mode
  refFile: null,
  setRefFile: (f) => set({ refFile: f }),
  refLabel: 'Reference audio',
  setRefLabel: (l) => set({ refLabel: l }),
  refText: '',
  setRefText: (t) => set({ refText: t }),
  xvecOnly: false,
  setXvecOnly: (v) => set({ xvecOnly: v }),
  presetRefs: [],
  setPresetRefs: (refs) => set({ presetRefs: refs }),
  presetRefId: null,
  setPresetRefId: (id) => set({ presetRefId: id }),
  recPreviewUrl: null,
  setRecPreviewUrl: (url) => set({ recPreviewUrl: url }),

  // Custom mode
  speakers: [],
  setSpeakers: (s) => set({ speakers: s }),
  selectedSpeaker: 'Aiden',
  setSelectedSpeaker: (s) => set({ selectedSpeaker: s }),
  customInstr: '',
  setCustomInstr: (t) => set({ customInstr: t }),

  // Voice design
  voiceInstr: 'A warm, calm narrator with a clear and engaging delivery.',
  setVoiceInstr: (t) => set({ voiceInstr: t }),

  // Generation state
  busy: false,
  setBusy: (v) => set({ busy: v }),
  queuePosition: null,
  setQueuePosition: (n) => set({ queuePosition: n }),

  // Progress
  generating: false,
  setGenerating: (v) => set({ generating: v }),
  progressDone: false,
  setProgressDone: (v) => set({ progressDone: v }),
  streaming: false,
  setStreaming: (v) => set({ streaming: v }),

  // Results
  audioUrl: null,
  setAudioUrl: (url) => set({ audioUrl: url }),
  dlBlob: null,
  setDlBlob: (b) => set({ dlBlob: b }),
  metrics: {},
  setMetrics: (m) => set({ metrics: m }),
  updateMetrics: (m) => set((state) => ({ metrics: { ...state.metrics, ...m } })),

  // Messages
  msgType: null,
  msgText: '',
  msgSwitchModel: null,
  msgSwitchMode: null,
  showMsg: (type, text, switchModel, switchMode) =>
    set({ msgType: type, msgText: text, msgSwitchModel: switchModel ?? null, msgSwitchMode: switchMode ?? null }),
  hideMsg: () => set({ msgType: null, msgText: '', msgSwitchModel: null, msgSwitchMode: null }),
}))
