FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server/ ./server/
COPY tsconfig.json tsconfig.node.json ./

EXPOSE 3001

CMD ["npx", "tsx", "server/index.ts"]
