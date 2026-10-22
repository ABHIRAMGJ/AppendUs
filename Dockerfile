# Optional: run the whole platform yourself instead of on Lovable hosting.
# The React app is built with nitro's node-server preset and talks to the
# Python AI service through AI_SERVICE_URL.

FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ENV NITRO_PRESET=node-server
RUN bun run build

FROM node:22-slim AS runtime
WORKDIR /app
COPY --from=build /app/.output ./.output
ENV HOST=0.0.0.0 \
    PORT=8080 \
    AI_SERVICE_URL=http://ai-service:8100
EXPOSE 8080
CMD ["node", ".output/server/index.mjs"]
