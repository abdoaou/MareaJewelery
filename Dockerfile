# Dokploy: Build Type = Dockerfile, Dockerfile path = Dockerfile, context = .
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl

FROM base AS deps
ENV NODE_ENV=development
COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY website/package.json ./website/
COPY admin/package.json ./admin/
COPY api/prisma ./api/prisma/
RUN npm ci --include=dev --ignore-scripts
RUN npx prisma generate --schema=api/prisma/schema.prisma

FROM deps AS build
ENV NODE_ENV=development
COPY . .
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build -w website
RUN npm run build:subdomain -w admin

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/api ./api
COPY --from=build /app/website/dist ./website/dist
COPY --from=build /app/admin/dist ./admin/dist
WORKDIR /app/api
EXPOSE 3000
CMD ["npm", "run", "start"]
