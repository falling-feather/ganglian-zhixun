FROM node:24-bookworm-slim
WORKDIR /app
ENV COREPACK_HOME=/opt/corepack
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ffmpeg libgomp1 libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
RUN npm install --global corepack@0.36.0 && corepack enable && corepack prepare pnpm@11.9.0 --activate
COPY packages/context-engine/worker/requirements-ai025.txt /tmp/requirements-ai025.txt
COPY packages/media-processing/worker/requirements-be007.txt /tmp/requirements-be007.txt
RUN python3 -m venv /opt/ronggang-python && /opt/ronggang-python/bin/pip install --no-cache-dir -r /tmp/requirements-ai025.txt -r /tmp/requirements-be007.txt
ENV RONGGANG_AI025_PYTHON=/opt/ronggang-python/bin/python RONGGANG_CONTENT_PYTHON=/opt/ronggang-python/bin/python RONGGANG_AI025_MODEL_DIR=/data/models/embeddings RONGGANG_BE007_MODEL_DIR=/data/models/media
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build && mkdir -p /data && chown -R node:node /app /data /opt/corepack
ENV NODE_ENV=production COREPACK_ENABLE_NETWORK=0 DEMO_SKIP_BUILD=1 DEMO_REUSE_DATA=1 DEMO_OPEN_BROWSER=0 DEMO_HOST=0.0.0.0 DEMO_DATA_DIR=/data/runtime DEMO_API_PORT=3001
USER node
EXPOSE 3001
STOPSIGNAL SIGTERM
CMD ["node", "deploy/start-api.mjs"]
