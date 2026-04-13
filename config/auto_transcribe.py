"""
Batch-transcribe speaker reference audio files using a local Whisper-compatible API.

Creates .reference.txt files alongside each audio file in the speakers directory.
These transcriptions are used by generate_voices.py to build the voice registry.

Usage:
    python auto_transcribe.py [--api-url http://localhost:8010/v1/audio/transcriptions]

IMPORTANT: Reference audio for voice cloning should be 5-15 seconds long.
Longer files will produce poor cloning results and slow down inference.
"""

import os
import sys
import json
import argparse
import requests

def main():
    parser = argparse.ArgumentParser(description="Batch-transcribe speaker reference audio")
    parser.add_argument("--api-url", default="http://localhost:8010/v1/audio/transcriptions",
                        help="Whisper-compatible transcription API URL")
    parser.add_argument("--speaker-dir", default="./speakers",
                        help="Directory containing speaker audio files")
    parser.add_argument("--model", default="whisper-1",
                        help="Transcription model name")
    args = parser.parse_args()

    speaker_dir = args.speaker_dir

    # Verify API is reachable
    try:
        requests.get(args.api_url.rsplit('/', 2)[0], timeout=5)
    except requests.ConnectionError:
        print(f"Error: Cannot reach transcription API at {args.api_url}")
        print("Make sure your Whisper/ASR service is running.")
        sys.exit(1)

    if not os.path.exists(speaker_dir):
        print(f"Error: Speaker directory not found: {speaker_dir}")
        sys.exit(1)

    audio_files = [f for f in os.listdir(speaker_dir)
                   if f.endswith(('.wav', '.mp3')) and not f.startswith('.')]

    print(f"Found {len(audio_files)} audio files in {speaker_dir}")

    for filename in sorted(audio_files):
        base_name = os.path.splitext(filename)[0]
        ref_txt_path = os.path.join(speaker_dir, f"{base_name}.reference.txt")

        if os.path.exists(ref_txt_path):
            print(f"  Skipping {filename} (already transcribed)")
            continue

        filepath = os.path.join(speaker_dir, filename)
        print(f"  Transcribing {filename}...", end=" ", flush=True)

        try:
            with open(filepath, 'rb') as f:
                response = requests.post(
                    args.api_url,
                    files={"file": (filename, f)},
                    data={"model": args.model},
                    timeout=60,
                )

            if response.status_code == 200:
                # Handle both JSON and plain text responses
                try:
                    text = response.json().get("text", "").strip()
                except (json.JSONDecodeError, AttributeError):
                    text = response.text.strip()

                if text:
                    with open(ref_txt_path, 'w', encoding='utf-8') as f:
                        f.write(text)
                    print(f"OK ({len(text)} chars)")
                else:
                    print("EMPTY (no speech detected)")
            else:
                print(f"FAILED (HTTP {response.status_code})")

        except requests.Timeout:
            print("TIMEOUT")
        except Exception as e:
            print(f"ERROR: {e}")

    print("Done.")

if __name__ == "__main__":
    main()
