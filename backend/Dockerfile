FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Set SAMAAN_HF_MODEL_REPO to your HF Hub model repo (e.g. username/samaan-credit-model)
# in HuggingFace Spaces Secrets panel. If not set, model trains locally on startup.
ENV SAMAAN_HF_MODEL_REPO=""

COPY . .

RUN mkdir -p /data/uploads

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
