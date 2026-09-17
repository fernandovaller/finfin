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
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh && mkdir -p data && chown -R node:node /app

EXPOSE 3001
# Entrypoint ajusta o dono do volume e derruba para o user `node`
# (o sqlite guarda dados sensíveis — processo não roda como root).
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/main"]
