# 07 — Infra: boot, guards, entidades, migrations

## Boot (`backend/src/main.ts`)

- Portas: `BACKEND_PORT | PORT → 3001`, `FRONTEND_PORT → 3000` (`:14-16`).
- CORS só `localhost/127.0.0.1:<FRONTEND_PORT>` (`:19-22,:31-33`); `helmet()` (`:27`);
  prefixo global `api` (`:26`); `chmod 0600` no sqlite (`:37`).

## Módulo (`app.module.ts:29-51`)

`TypeOrmModule.forRoot` (better-sqlite3, `data/finfin.sqlite`, `migrationsRun: true`,
`synchronize` proibido, `:35`) + `forFeature` 9 entidades. Controllers
`[Auth, App, Catalogo, Auditoria]` (`:41`). Providers + `APP_GUARD LimiteGuard`
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
| `sessoes` | `token PK, usuarioId, expiraEm, criadoEm` |
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
