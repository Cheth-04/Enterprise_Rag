FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    libglib2.0-0 \
    libgl1 \
    poppler-utils \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --upgrade pip

RUN pip install --default-timeout=1000 --no-cache-dir -r requirements.txt

COPY app ./app

RUN mkdir -p /app/uploads /app/uploads/jobs

# Single worker — background threads handle ingestion concurrency.
# 2 workers doubled RAM usage (BGE-M3 loaded twice = ~4 GB) causing OOM on large PDFs.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8010", "--workers", "1"]
