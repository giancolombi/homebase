# API service: Express 5 + PostgreSQL, run through tsx (no build step).
# Production deps only and a non-root user.

FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

ENV NODE_ENV=production
WORKDIR /app

COPY --chown=node:node package.json pnpm-lock.yaml ./
# The prepare script runs on install; its shim must exist (it exits 0 here
# because NODE_ENV=production).
COPY --chown=node:node .husky/install.mjs ./.husky/install.mjs
RUN pnpm install --frozen-lockfile --prod

COPY --chown=node:node api/ ./api/
COPY --chown=node:node scripts/ ./scripts/
COPY --chown=node:node tsconfig.json tsconfig.node.json ./

USER node

EXPOSE 3001

CMD ["pnpm", "exec", "tsx", "api/index.ts"]
