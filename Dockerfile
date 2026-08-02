FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY docker-healthcheck.js ./

# Only meaningful in http mode; in stdio mode there is no HTTP server to probe,
# so the check exits 0 immediately. Uses node (always present) instead of
# curl/wget, which are not installed in node:22-alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "docker-healthcheck.js"]

ENTRYPOINT ["node", "dist/index.js"]
