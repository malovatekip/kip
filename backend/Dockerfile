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

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "python startup.py && uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 1"]
