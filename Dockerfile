FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json tailwind.config.ts postcss.config.js components.json ./
COPY src/ ./src/
COPY public/ ./public/
COPY server/static.ts ./server/

RUN npm run build

EXPOSE 8080

CMD ["npx", "tsx", "server/static.ts"]
