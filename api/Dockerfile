# Monorepo-friendly API image (build from repo root):
#   docker build -f api/Dockerfile .
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY website/package.json ./website/
COPY admin/package.json ./admin/
COPY api/prisma ./api/prisma/
RUN npm ci
RUN npx prisma generate --schema=api/prisma/schema.prisma

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY package.json package-lock.json ./
COPY api ./api
WORKDIR /app/api
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "run", "start"]
