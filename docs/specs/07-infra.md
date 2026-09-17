# 07 — Infra: boot, guards, entidades, migrations

## Boot (`backend/src/main.ts`)

- Portas: `BACKEND_PORT | PORT → 3001`, `FRONTEND_PORT → 3000` (`:20-22`).
  Escuta em `0.0.0.0` (Docker, `:111`).
- `assertConfigCookies()` no boot: produção sem `COOKIE_SECURE=true` aborta.
  `cookieParser()` ligado; refresh em cookie HttpOnly.
- Toda resposta da API sai com `Cache-Control: no-store` + `Pragma: no-cache` (`:76-80`).
- Corpo JSON/urlencoded limitado a `1mb` (`:82-83`); gigante → 413
  `Corpo grande demais (máximo 1 MB)` via `FiltroErros` (`:38-67`).
  `HttpException` repassa mensagem curada sem stack/path; resto → 500 genérico.
- `ValidationPipe` global: `whitelist + forbidNonWhitelisted + transform`
  (`:85-91`) — campo extra → 400, query string convertida antes de validar.
- CORS: base `localhost/127.0.0.1:<FRONTEND_PORT>` + extras `CORS_ORIGINS`
  (`:25-35`); `credentials: true` (`:99-103`); `helmet()` (`:73`);
  prefixo global `api` (`:72`); `chmod 0600` no sqlite (`:106-110`).
- `trust proxy` só com `CONFIAR_PROXY=true` (rate-limit por IP real atrás do nginx).

## Docker / compose

- Imagem backend roda via `entrypoint.sh`: se root, `chown /app/data` e derruba
  privilégio para `node` (`gosu/runuser/su/setpriv`, fail-closed); `data/` com
  `chown node:node` no build.
- `docker-compose.yml` (prod): backend sem `ports` (rede interna via nginx do
  frontend); env repassadas `RESEND_API_KEY/EMAIL_REMETENTE/FRONTEND_URL/
  COOKIE_SECURE/CORS_ORIGINS` +   `CONFIAR_PROXY=true`; `security_opt:
  no-new-privileges:true`; healthcheck backend `GET /api/saude`, frontend `wget /`;
  `depends_on: service_healthy`. `docker-compose.override.yml` (dev local) reexpõe
  `backend ${BACKEND_PORT:-3001}:3001`.
- `FRONTEND_URL` base do link de recuperação; `frontend/nginx.conf` proxy
  `/api/` → `backend:3001` com `Cache-Control: no-store`.

## Módulo (`app.module.ts:29-51`)

`TypeOrmModule.forRoot` (better-sqlite3, `data/finfin.sqlite`, `migrationsRun: true`,
`synchronize` proibido, `:35`) + `forFeature` 9 entidades. Controllers
`[Auth, App, Catalogo, Auditoria, Saude]` (`:42`). Providers + `APP_GUARD LimiteGuard`
(`:42-50`, roda antes do `AuthGuard`, `:48`).

## Guards

- `AuthGuard` (`auth.guard.ts:5-14`): resolve Bearer via `donoDoToken`, injeta
  `req.usuario`, senão 401.
- `LimiteGuard` (`limite.guard.ts:11,15,29-56`): rate-limit em memória por `IP|rota`,
  janela 60s, padrão 100/min, `@Limite(n)` sobrescreve, 429 `Muitas requisições...`,
  GC acima de 10k chaves.

## Entidades

| Tabela | Campos e constraints |
|---|---|
| `categorias` (`categoria.entity.ts`) | `id, nome, tipo: receita\|despesa, cor default 'slate', usuarioId nullable`; `@Unique(usuarioId, nome, tipo)` |
| `formas_pagamento` | `id, nome, usuarioId nullable`; `@Unique(usuarioId, nome)` |
| `contas` (`conta.entity.ts`) | `id, nome, saldoInicial real 0, nota '', icone '', principal false, usuarioId nullable, demo false`; `@Unique(usuarioId, nome)` |
| `receitas` | `id, data string, valor real, categoria, origem, formaPagamento '', contaId nullable, nota '', fitid nullable, usuarioId nullable, demo false` |
| `despesas` | igual receita + `descricao ''` em vez de origem + `grupoParcela nullable, parcelaAtual/Total nullable` |
| `usuarios` | `id, nome, email unique, senhaHash, avatar nullable, resendApiKey nullable, criadoEm` |
| `sessoes` | `token PK, usuarioId, expiraEm, criadoEm, tipo: access\|refresh\|null, refreshToken nullable` |
| `recuperacoes_senha` | `id, usuarioId, tokenHash unique, expiraEm, usadoEm nullable (uso único), criadoEm` |
| `auditorias` | `id, usuarioId nullable, modulo, acao, registroId nullable, descricao '', detalhes text (JSON ≤ 8000), criadoEm` |

## Migrations (`backend/src/migrations/`, registradas `app.module.ts:22-26`)

1. `1789505184849-criacao-inicial` — 7 tabelas + UNIQUEs + FKs (`sessoes CASCADE`);
   rebuild copia dados de banco velho; `PRAGMA foreign_key_check` aborta se órfão;
   índices `usuarioId/contaId`.
2. `1789558563730-resend-api-key` — `ALTER usuarios ADD resendApiKey` idempotente.
3. `1789559058157-recuperacao-senha` — cria `recuperacoes_senha` (`tokenHash UNIQUE`,
   FK usuário CASCADE).
4. `1789561000000-auditoria` — cria `auditorias` (FK usuário sem cascade).
5. `1789562000000-demo` — `ADD demo default 0` em receitas/despesas/contas; `down` no-op.
6. `1789563000000-sessao-refresh` — `ADD tipo + refreshToken` em `sessoes` (idempotente;
   linhas antigas ficam `NULL` e valem como access até expirarem).
