FROM node:20-slim AS build

# better-sqlite3 precisa compilar binding nativo.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
# Instalação determinística a partir do package-lock.json (árvore Nest 10).
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim AS prod

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm rebuild better-sqlite3
COPY --from=build /app/dist ./dist

RUN mkdir -p data
EXPOSE 3001
CMD ["node", "dist/main"]
