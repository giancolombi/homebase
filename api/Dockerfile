FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY api/ ./api/
COPY tsconfig.json tsconfig.node.json ./

EXPOSE 3001

CMD ["npx", "tsx", "api/index.ts"]
