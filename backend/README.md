---
title: SAMAAN Backend
emoji: 🏛️
colorFrom: teal
colorTo: gold
sdk: docker
app_port: 7860
pinned: true
---

# SAMAAN Backend

FastAPI backend for the SAMAAN platform.

## Run locally

```bash
pip install -r requirements.txt
python -c "from main import app"
uvicorn main:app --host 0.0.0.0 --port 7860
```

## HuggingFace Spaces

Deploy this folder as a Docker Space. The app listens on port `7860`.

