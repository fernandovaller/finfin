# 01 — Visão geral

## Produto

FinFin — tracker de finanças pessoais, UI em pt-BR/en (i18n, padrão pt-BR). Receitas e
despesas por categoria, conta e forma de pagamento. Despesa parcela em até 21x.
Importa extrato OFX com anti-duplicidade por FITID. Resumo mensal, relatórios com
gráficos, auditoria com restauração, backup JSON/CSV, dados demo, conta com avatar,
tema claro/escuro e largura fluida/fixa. Moeda exibida sempre em BRL (Intl pt-BR fixo).

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | NestJS 10 + TypeScript + TypeORM + SQLite (`better-sqlite3`) |
| Frontend | React 19 + Vite 6 + TypeScript + Tailwind CSS v4 + React Router 7 + recharts 3 + i18next/react-i18next |
| Banco | SQLite em arquivo, schema dono das migrations aplicadas no boot |

## Portas e origem

- Backend `:3001`, frontend `:3000` (ajustáveis por `BACKEND_PORT` / `FRONTEND_PORT`).
- Prefixo global da API: `/api` (`backend/src/main.ts:26`).
- Dev: Vite faz proxy `/api/...` → `localhost:3001` (`frontend/vite.config.ts:15-20`).
- Docker: nginx do frontend faz proxy `/api/...` → serviço `backend`.
- CORS aceita `localhost/127.0.0.1:<FRONTEND_PORT>` + extras via `CORS_ORIGINS`
  (vírgula), com `credentials: true` (cookie de refresh). Atrás de proxy,
  `CONFIAR_PROXY=true` liga `trust proxy` para o rate-limit enxergar o IP real.

## Convenções

- Todo código, comentários, UI e commits em pt-BR.
- Commits convencionais em pt-BR (`feat(relatorios): ...`).
- Backend flat: um arquivo por conceito em `backend/src`, sem módulos por feature.
  Validação em duas camadas: DTOs (`backend/src/dto/`) + regras manuais nos services.
- Frontend: páginas em `pages/`, rotas com `HashRouter` (`frontend/src/main.tsx`).
  Textos via i18next (`frontend/src/i18n/`, chave `finfin_idioma` em `localStorage`);
  troca em Configurações → Geral.
- `*.sqlite` e `*.ofx` nunca são commitados (podem conter dados reais).

## Multiusuário

- Toda rota protegida usa `AuthGuard`, que resolve o access Bearer (15 min, só em
  memória no frontend) na tabela `sessoes` e injeta `req.usuario`
  (`backend/src/auth.guard.ts:5-14`). O refresh (7 dias, rotativo) viaja em cookie
  HttpOnly e só serve ao `POST /auth/refresh`.
- Controllers extraem `req.usuario.id` e passam `usuarioId` ao service.
- Toda query é escopada por `usuarioId`; nunca busca por id sem o dono.
- Entidades de lançamento/catálogo têm `usuarioId` nullable (era pré-login).
- Primeiro cadastro do sistema herda tudo que está órfão (`usuarioId IS NULL`);
  usuários seguintes recebem seed próprio + conta "Conta Principal".
