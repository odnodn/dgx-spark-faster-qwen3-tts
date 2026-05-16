export interface ParsedWav {
  pcm: Float32Array
  rawPcm: Uint8Array
  sr: number
}

export function parseWav(bytes: Uint8Array): ParsedWav | null {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const sr = v.getUint32(24, true)
  let off = 12
  while (off + 8 <= bytes.length) {
    const id = String.fromCharCode(bytes[off], bytes[off+1], bytes[off+2], bytes[off+3])
    const size = v.getUint32(off + 4, true)
    if (id === 'data') {
      const raw = bytes.slice(off + 8, off + 8 + size)
      const i16 = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2)
      const f32 = new Float32Array(i16.length)
      for (let i = 0; i < i16.length; i++) f32[i] = i16[i] / 32768.0
      return { pcm: f32, rawPcm: raw, sr }
    }
    off += 8 + size
  }
  return null
}

export function buildFinalWav(rawPcmParts: Uint8Array[], sampleRate: number): Blob | null {
  if (!rawPcmParts.length) return null
  const totalPcm = rawPcmParts.reduce((s, p) => s + p.length, 0)
  const ab = new ArrayBuffer(44 + totalPcm)
  const v = new DataView(ab)
  const ws = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  ws(0, 'RIFF'); v.setUint32(4, 36 + totalPcm, true)
  ws(8, 'WAVE'); ws(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  ws(36, 'data'); v.setUint32(40, totalPcm, true)
  const out = new Uint8Array(ab, 44)
  let offset = 0
  for (const part of rawPcmParts) { out.set(part, offset); offset += part.length }
  return new Blob([ab], { type: 'audio/wav' })
}

export function bufToWav(buffer: AudioBuffer): Blob {
  const pcm = buffer.getChannelData(0)
  const len = pcm.length, sr = buffer.sampleRate
  const ab = new ArrayBuffer(44 + len * 2)
  const v = new DataView(ab)
  const ws = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  ws(0, 'RIFF'); v.setUint32(4, 36 + len * 2, true)
  ws(8, 'WAVE'); ws(12, 'fmt ')
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  ws(36, 'data'); v.setUint32(40, len * 2, true)
  let off = 44
  for (let i = 0; i < len; i++, off += 2) {
    const s = Math.max(-1, Math.min(1, pcm[i]))
    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([ab], { type: 'audio/wav' })
}

export class AudioEngine {
  private actx: AudioContext | null = null
  private sproc: ScriptProcessorNode | null = null
  private pcmQueue: Array<{ data: Float32Array; pos: number }> = []
  rawPcmParts: Uint8Array[] = []
  rawPcmSr = 24000
  private chunkQ: Promise<void> = Promise.resolve()
  firstChunkAt: number | null = null
  firstAudioAt: number | null = null
  lastBufS = 0
  onFirstAudio?: () => void

  async init(sr = 24000) {
    this.rawPcmSr = sr || 24000
    this.pcmQueue = []
    this.rawPcmParts = []
    this.chunkQ = Promise.resolve()
    this.firstChunkAt = null
    this.firstAudioAt = null
    this.lastBufS = 0

    if (this.actx) {
      if (this.actx.state === 'suspended') await this.actx.resume()
      return
    }
    this.actx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: this.rawPcmSr })
    this.sproc = this.actx.createScriptProcessor(256, 0, 1)
    this.sproc.onaudioprocess = (e) => {
      const out = e.outputBuffer.getChannelData(0)
      let i = 0, wrote = false
      while (i < out.length) {
        if (!this.pcmQueue.length) { out.fill(0, i); break }
        const seg = this.pcmQueue[0]
        const take = Math.min(out.length - i, seg.data.length - seg.pos)
        out.set(seg.data.subarray(seg.pos, seg.pos + take), i)
        seg.pos += take; i += take; wrote = true
        if (seg.pos >= seg.data.length) this.pcmQueue.shift()
      }
      if (wrote && this.firstAudioAt == null) {
        this.firstAudioAt = performance.now()
        this.onFirstAudio?.()
      }
    }
    if (this.actx.state === 'suspended') await this.actx.resume()
    this.sproc.connect(this.actx.destination)
  }

  enqueueChunk(b64: string) {
    this.chunkQ = this.chunkQ.then(() => {
      if (!this.actx) return
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const p = parseWav(bytes)
      if (!p) return
      this.rawPcmParts.push(p.rawPcm)
      this.pcmQueue.push({ data: p.pcm, pos: 0 })
      if (this.firstChunkAt == null) this.firstChunkAt = performance.now()
      this.lastBufS = this.pcmQueue.reduce((s, seg) => s + (seg.data.length - seg.pos), 0) / this.rawPcmSr
    })
  }

  async waitChunks() {
    await this.chunkQ
  }

  buildFinalWav(): Blob | null {
    return buildFinalWav(this.rawPcmParts, this.rawPcmSr)
  }

  destroy() {
    this.sproc?.disconnect()
    this.actx?.close()
    this.actx = null
    this.sproc = null
  }
}
