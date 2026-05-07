FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY api/ ./api/
COPY scripts/ ./scripts/
COPY tsconfig.json tsconfig.node.json ./

EXPOSE 3001

CMD ["pnpm", "exec", "tsx", "api/index.ts"]
