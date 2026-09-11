# The voice agent relay — the half of this repo Vercel cannot host.
#
# `agent.py` is a long-lived worker: it holds a WebSocket open to LiveKit and
# waits to be dispatched into rooms. Vercel runs short-lived serverless
# functions, so the Next.js app deploys there and this image deploys somewhere
# that runs a process — LiveKit Cloud Agents (`lk agent deploy`), Render,
# Railway, Fly.io, or any VM.
#
# Build and run locally to check the image before shipping it:
#
#   docker build -t halyx-agent .
#   docker run --rm --env-file .env.local halyx-agent
#
# 3.12 rather than 3.13/3.14: several of the audio and ONNX wheels this depends
# on still lag a new Python release, and a worker is not the place to find that
# out. It matches the interpreter the agent was developed and tested against.
FROM python:3.12-slim

# `libgomp1` is needed by onnxruntime, which backs the Silero VAD and the
# turn-detector model. Without it the import fails at runtime rather than build
# time, so the worker registers and then dies on its first job.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Never run the worker as root, and give it a writable home: the plugins cache
# their downloaded models under it.
RUN useradd -m -u 10001 agent
WORKDIR /app

# Dependencies first, so a change to agent.py does not re-resolve the whole
# tree on every build.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py preflight.py ./
RUN chown -R agent:agent /app
USER agent

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/home/agent/.cache/huggingface

# Fetch the VAD and turn-detector weights at build time rather than on the first
# conversation. Baked into the image, this is a one-off; left to runtime it is a
# model download standing between a visitor pressing Start and hearing anything.
RUN python agent.py download-files

# `start` is the production mode: no dev logging, no reload, and the worker
# keeps twelve processes warm so a conversation never waits on a cold start.
CMD ["python", "agent.py", "start"]
