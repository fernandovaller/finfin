# AGENTS.md — finfin

Personal finance tracker (PT-BR). `PLAN.md` is product spec: Receitas / Despesas (Necessidades, Renda, Dívidas, Desejos), monthly reports.

## Layout

- `backend/` — NestJS 10 + TS + SQLite (`better-sqlite3` + TypeORM, file `backend/data/finfin.sqlite`, `synchronize: true` creates tables on boot). Entry `src/main.ts` (port **3001**, global prefix `api`, CORS on). Entities in `src/*.entity.ts`; `AppController` exposes `POST/GET/PUT/DELETE /api/receitas[/:id]`, `POST/GET/PUT/DELETE /api/despesas[/:id]`, `GET /api/resumo?mes=YYYY-MM`; `CatalogoController` exposes CRUD `GET/POST/PUT/DELETE /api/categorias[/:id]` (`?tipo=` filter) and `/api/formas-pagamento[/:id]`, seeded on first boot, `409` when deleting anything still referenced by lançamentos. Validation is manual in services (`BadRequestException`); `class-validator` is not installed.
- `frontend/` — React 19 + Vite 6 + TS + Tailwind CSS v4 (via `@tailwindcss/vite` plugin; styles in `src/index.css` with `@import "tailwindcss"` + `@theme`). `HashRouter` in `src/main.tsx` (`#/` routes work with any static server, no rewrite config); sidebar layout in `src/Layout.tsx`; pages in `src/pages/` (Home, Lancamentos, Relatorios, Categorias, FormasPagamento); shared API client/types in `src/api.ts`, shared UI in `src/ui.tsx`; create/edit form in `src/LancamentoForm.tsx` (BRL mask, semantic accent per tipo, options from catalog API). API calls use relative `/api/...`, proxied to the backend by `vite.config.ts`.
- No workspace, no CI. Not a git repo. Root `package.json` is only a `concurrently` runner + `setup`/`build` shortcuts.

## Commands (root runner — preferred)

```sh
npm run setup    # install root + backend + frontend deps (first time)
npm run dev      # backend (:3001, watch) + frontend (:3000) together, logs tagged [backend]/[frontend]
npm run build    # builds backend then frontend
npm run dev:backend / npm run dev:frontend   # one side only
```

`npm run ... --prefix <pkg>` keeps that package's dir as CWD, so the SQLite path
(`backend/data/finfin.sqlite`) resolves the same from root or per-package.

Per-package fallback: `cd backend && npm run start:dev`, `cd frontend && npm run dev`.

## Gotchas — verified

- `backend/tsconfig.json` needs `experimentalDecorators` + `emitDecoratorMetadata` — without them Nest decorators fail to compile (this bit the original scaffold, whose controller was a stub "to avoid decorator issues").
- Controller methods must `return` service promises — fire-and-forget makes rejections unhandled and **crashes the process** (happened with a 409 on delete).
- `frontend/tsconfig.json` needs `moduleResolution: bundler` — without it, `tsc` fails on `.tsx` files with `TS7026: JSX element implicitly has type 'any'` under React 19 types.
- `frontend/tsconfig.json` needs `noEmit: true` — without it, `tsc -b` drops stale `.js` next to sources and Vite resolves `.js` before `.ts`, silently serving outdated code.
- Ports are split on purpose: backend `:3001`, frontend `:3000`. Don't reunify — Vite proxy assumes `:3001`.
- `backend` scripts `npm test` / `npm run lint` still reference `jest`/`eslint`, which are not in devDependencies — they fail if run.
- `backend/dist/` and `frontend/dist/` are checked in — stale output, don't edit; rebuild instead.
- Data persists in `backend/data/finfin.sqlite` (auto-created on boot). Run only one backend at a time — concurrent writers on the same file hit `SQLITE_BUSY`.
- `synchronize: true` is dev-only convenience; switch to migrations before any production use.
