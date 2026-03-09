FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY vite.config.ts tsconfig.json tsconfig.node.json postcss.config.js ./
COPY app/ ./app/
COPY api/static.ts ./api/

RUN npm run build

EXPOSE 8080

CMD ["npx", "tsx", "api/static.ts"]
