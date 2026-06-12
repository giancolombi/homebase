# Frontend service: builds the SPA, then serves dist/ + proxies /api via
# serve.ts. Multi-stage so the runtime image carries only production deps
# (no vite/typescript/eslint toolchain).

FROM node:24-alpine AS build

RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY vite.config.ts tsconfig.json tsconfig.node.json postcss.config.js ./
COPY app/ ./app/

RUN pnpm run build

FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

ENV NODE_ENV=production
WORKDIR /app

COPY --chown=node:node package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node serve.ts ./
COPY --chown=node:node scripts/ ./scripts/
# pre-deploy hook (railway.json) runs db:migrate, which reads from this dir
COPY --chown=node:node api/migrations/ ./api/migrations/

USER node

EXPOSE 8080

CMD ["pnpm", "exec", "tsx", "serve.ts"]
