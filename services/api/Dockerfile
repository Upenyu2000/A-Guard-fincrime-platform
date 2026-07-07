FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY services/api/package.json services/api/package.json
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json /app/package-lock.json ./
COPY --from=dependencies /app/apps/web/package.json ./apps/web/package.json
COPY --from=dependencies /app/services/api/package.json ./services/api/package.json
COPY services/api ./services/api
COPY tsconfig.base.json ./tsconfig.base.json
RUN npm run prisma:generate -w @african-guard/api \
    && npm run build -w @african-guard/api \
    && npm prune --omit=dev

FROM node:24-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/services/api/dist ./services/api/dist
COPY --from=builder --chown=node:node /app/services/api/package.json ./services/api/package.json
COPY --from=builder --chown=node:node /app/services/api/prisma ./services/api/prisma
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/v1/live/health/live >/dev/null || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "services/api/dist/main.js"]
