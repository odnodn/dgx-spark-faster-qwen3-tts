# Faster-Qwen3-TTS for NVIDIA DGX Spark (GB10)

Run [faster-qwen3-tts](https://github.com/andimarafioti/faster-qwen3-tts) on the **NVIDIA DGX Spark GB10** (ARM64 / SM 121 / CUDA 13) as a Docker container with an OpenAI-compatible TTS API.

Integrates with **OpenWebUI**, **SillyTavern**, and any OpenAI TTS-compatible client.

## What this solves

The DGX Spark GB10 has a unique combination of ARM64 (Grace CPU) + Blackwell GPU (SM 121) that causes issues with standard ML Docker images:

- **torchaudio ARM64 wheels** - resolved by using PyTorch's `cu130` wheel index
- **Flash Attention** - won't compile on SM 121, but faster-qwen3-tts uses CUDA graphs instead (6-10x speedup)
- **CUDA graph capture** - works on SM 121 with max_seq_len tuned for voice cloning workloads
- **OpenWebUI voice discovery** - custom endpoints (`/v1/models`, `/v1/audio/voices`) for voice dropdown population

## Quick Start

### Option 1: Pull pre-built image (recommended)

```bash
# Pull the image
docker pull martinb78/faster-qwen3-tts-dgx-spark:latest

# Download the model
mkdir -p models
huggingface-cli download Qwen/Qwen3-TTS-12Hz-1.7B-Base --local-dir ./models/Qwen3-TTS

# Copy .env.example to .env and set MODEL_PATH
cp .env.example .env

# Add voice reference audio (5-15 second WAV/MP3 clips) to config/speakers/
# See "Adding Voices" below

# Start
docker compose up -d
```

### Option 2: Build from source

```bash
docker build -t faster-qwen3-tts-dgx-spark:latest .
```

## Adding Voices

Place reference audio files in `config/speakers/` using this naming convention:

```
EN_M_Speaker_Name.wav    # English, Male
EN_F_Speaker_Name.wav    # English, Female
DE_M_Speaker_Name.wav    # German, Male
```

**Important:** Reference audio must be **5-15 seconds** long. Longer files cause slow inference and poor voice cloning quality.

For each audio file, create a matching transcript:

```
EN_M_Speaker_Name.reference.txt
```

Or use the auto-transcription script (requires a running Whisper-compatible ASR service):

```bash
python config/auto_transcribe.py --api-url http://localhost:8010/v1/audio/transcriptions
```

The `generate_voices.py` script runs automatically on container startup and creates `voices.json` from your speaker files.

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/v1/audio/speech` | POST | Generate speech (OpenAI-compatible) |
| `/v1/models` | GET | List available voices |
| `/v1/audio/voices` | GET | List voices (OpenWebUI fallback) |
| `/v1/audio/models` | GET | List models (OpenWebUI fallback) |
| `/speakers` | GET | List speaker IDs (SillyTavern) |

### Example

```bash
curl -X POST http://localhost:8020/v1/audio/speech \
  -H "Content-Type: application/json" \
  -d '{"model": "tts-1", "input": "Hello world!", "voice": "speaker_name", "response_format": "wav"}' \
  --output speech.wav
```

## OpenWebUI Configuration

In OpenWebUI Settings > Audio > Text-to-Speech:

| Setting | Value |
|---|---|
| Engine | OpenAI |
| URL | `http://faster-qwen3-tts:8000/v1` |
| API Key | `sk-dummy-key` |
| TTS Model | `tts-1` |
| TTS Voice | Select from dropdown |

## Performance

On DGX Spark GB10 with the 1.7B model:

| Input | Audio Duration | Generation Time | RTF |
|---|---|---|---|
| Short sentence | ~2s | ~2.5s | 0.8 |
| Medium paragraph | ~7s | ~5.5s | 0.77 |

First request is slower due to one-time CUDA graph warmup.

## Hardware Requirements

- NVIDIA DGX Spark GB10 (or any ARM64 + Blackwell GPU with CUDA 13)
- ~6 GB GPU memory for the 1.7B model
- CUDA driver 580+ with CUDA 13.0 support

## Credits

- [faster-qwen3-tts](https://github.com/andimarafioti/faster-qwen3-tts) by Andres Marafioti
- [Qwen3-TTS](https://github.com/QwenLM/Qwen3-TTS) by Alibaba Qwen team
- DGX Spark compatibility fixes by [mARTin-B78](https://github.com/mARTin-B78)

## License

MIT (same as upstream faster-qwen3-tts)
