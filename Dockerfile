FROM node:24-alpine

RUN corepack enable && corepack prepare pnpm@10.23.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY vite.config.ts tsconfig.json tsconfig.node.json postcss.config.js ./
COPY app/ ./app/
COPY scripts/ ./scripts/
COPY serve.ts ./

RUN pnpm run build

EXPOSE 8080

CMD ["pnpm", "exec", "tsx", "serve.ts"]
