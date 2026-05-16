"""
Wrapper around faster-qwen3-tts's openai_server.py that injects additional
API endpoints for compatibility with OpenWebUI and SillyTavern.

Endpoints added:
  GET /v1/models        - Lists available voices (OpenWebUI primary discovery)
  GET /v1/audio/voices  - Lists available voices (OpenWebUI fallback)
  GET /v1/audio/models  - Lists available voices (OpenWebUI fallback)
  GET /speakers         - Lists speaker IDs (SillyTavern)
  OPTIONS /{path}       - Pre-flight CORS handler
"""

import sys
import json
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Point Python to the app directory inside the container
sys.path.append("/app/examples")
import openai_server

openai_server.app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r'^http://(localhost|127\.0\.0\.1):(4173|5173)$',
    allow_credentials=False,
    allow_methods=['GET', 'POST', 'OPTIONS'],
    allow_headers=['Accept', 'Content-Type'],
)

# Load generated voices
try:
    with open('/config/voices.json', 'r') as f:
        voices_data = json.load(f)
except FileNotFoundError:
    voices_data = {}

# Build reusable response payloads
_voice_list = [{'id': v, 'object': 'model', 'created': 1686935002, 'owned_by': 'qwen'} for v in voices_data.keys()]
_models_response = {'object': 'list', 'data': _voice_list}

# OpenWebUI model discovery (primary)
@openai_server.app.get('/v1/models')
async def list_models():
    return _models_response

# OpenWebUI voice discovery fallbacks
@openai_server.app.get('/v1/audio/voices')
async def list_audio_voices():
    return _models_response

@openai_server.app.get('/v1/audio/models')
async def list_audio_models():
    return _models_response

# SillyTavern speaker endpoint
@openai_server.app.get('/speakers')
async def get_speakers():
    return list(voices_data.keys())

# Pre-flight OPTIONS handler to prevent 404s
@openai_server.app.options('/{path:path}')
async def options_handler(path: str):
    return JSONResponse(content={'status': 'ok'})

if __name__ == '__main__':
    openai_server.main()
