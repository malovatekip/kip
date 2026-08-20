FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# CPU-only torch first — sentence-transformers would otherwise pull the much
# larger CUDA build, which is dead weight on a Fly shared-cpu machine.
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# kip_knowledge_db/chroma.sqlite3 ships gzipped (154MB raw exceeds GitHub's
# 100MB push limit) — decompress it into place so the pre-built knowledge
# base is there from the first request, no runtime ingestion needed.
RUN gunzip -f kip_knowledge_db/chroma.sqlite3.gz

# Pre-bake the RAG embedding model into the image at build time, not request
# time — avoids a slow/flaky Hugging Face Hub download blocking the single
# worker's event loop (and failing health checks) on a live user's first
# chat/idea request.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "python startup.py && uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
