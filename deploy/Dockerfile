FROM node:24-bookworm-slim
WORKDIR /app
RUN npm install --global pnpm@11.9.0
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build && mkdir -p /data && chown -R node:node /app /data
ENV NODE_ENV=production DEMO_SKIP_BUILD=1 DEMO_REUSE_DATA=1 DEMO_OPEN_BROWSER=0 DEMO_HOST=0.0.0.0 DEMO_DATA_DIR=/data DEMO_API_PORT=3001
USER node
EXPOSE 4173
STOPSIGNAL SIGTERM
CMD ["node", "deploy/start-hosted.mjs"]
