# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

FinFin — tracker de finanças pessoais (portfólio, em português). Backend NestJS + SQLite e frontend React, ambos em TypeScript, em pastas irmãs (`backend/`, `frontend/`) com `package.json` próprios e um runner raiz com `concurrently`.

**Todo o código, comentários, UI e commits são escritos em português (pt-BR).** Seguir esse padrão.

## Comandos

Rodar da raiz:

```sh
npm run setup        # instala deps (raiz + backend + frontend)
npm run dev          # backend (:3001, watch) + frontend (:3000) juntos
npm run dev:backend  # só backend  — http://localhost:3001/api/resumo
npm run dev:frontend # só frontend — http://localhost:3000
npm run build        # build do backend e do frontend
```

- Frontend chama `/api/...` e o Vite faz proxy para `localhost:3001` (ver `frontend/vite.config.ts`).
- Backend: `nest start --watch` (script `start:dev`). Build com `nest build`.
- Scripts `test` (backend, jest) e `lint` existem, mas **não há testes nem configs de eslint no repo** — não contar com eles.
- Banco: SQLite em `backend/data/finfin.sqlite`, criado no boot com `synchronize: true` (dev; o caminho é relativo ao cwd do backend). Nunca commitar `*.sqlite` ou `*.ofx` (extratos podem conter dados reais).

## Arquitetura

### Backend (backend/src — flat, um arquivo por conceito)

Não há módulos Nest por feature. Tudo é registrado no `AppModule` único (`app.module.ts`) via `TypeOrmModule.forRoot` + `forFeature`. Três controllers no mesmo nível:

- **`app.controller.ts` + `app.service.ts`** — lançamentos (`/receitas`, `/despesas`), `/resumo?mes=YYYY-MM`, `/contagem`, export (JSON `/exportar`, CSV `/exportar/csv`), import (manual `/importar`, extrato `/importar/ofx`), e apagão (`/dados/lancamentos`, `/dados/tudo`).
- **`catalogo.controller.ts` + `catalogo.service.ts`** — CRUD de `categorias`, `formas-pagamento` e `contas`, mais `/restaurar` (recria o catálogo padrão). Exclusões retornam **409** se o item está em uso por lançamentos.
- **`auth.controller.ts` + `auth.service.ts` + `auth.guard.ts`** — `/auth/cadastro|login|logout|eu|perfil|senha`.

Padrões que valem para qualquer rota nova:

- **Multiusuário**: toda rota protegida usa `AuthGuard`, que resolve o token Bearer (tabela `sessoes`, TTL 7 dias) e injeta `req.usuario`. Controllers extraem `req.usuario.id` e passam `usuarioId` para o service; **toda query é escopada por `usuarioId`** — nunca buscar por id sem o dono.
- Entidades de lançamento/catálogo têm `usuarioId` nullable (herda dados da era pré-login). `Conta` tem unique composta `(usuarioId, nome)`.
- Senhas com scrypt (`salt:hash`); sessões são tokens aleatórios persistidos no banco.
- No primeiro cadastro do sistema (`adotarOuSemear`), o usuário herda tudo que está órfão (`usuarioId IS NULL`); usuários seguintes recebem seed próprio (`SEED_CATEGORIAS`/`SEED_FORMAS`) + uma conta padrão "Conta Principal".

Conceitos de domínio em `app.service.ts`:

- **Despesa parcelada**: `parcelas` 1–21 desdobra em N despesas mensais ligadas por `grupoParcela` (UUID), com rateio em centavos (última parcela recebe o resto) e competência via `somarMeses`.
- **OFX**: `fitid` é a chave anti-duplicidade na importação de extrato (o parser `parseOfx` vive no frontend).
- Validação é manual nos services (`assertLancamento` etc.) com `BadRequestException` — não usa class-validator/DTOs.

### Frontend (frontend/src)

- `main.tsx` — rotas com **HashRouter**; páginas em `pages/` dentro de `Layout` protegido por `RotaProtegida` + `AuthProvider` (`auth.tsx`, token em `localStorage` com chave `finfin_token`).
- `api.ts` — único ponto de rede: wrapper `api<T>` injeta o Bearer, trata 401 (limpa token → "sessão expirada"; sem token, propaga o erro real de credenciais) e junta `message` de erro do Nest. Interfaces TS espelham as entidades do backend.
- `ui.tsx` — primitivas compartilhadas: formatação BRL (`Intl` pt-BR), helpers de mês, `BadgeCategoria`, ícones SVG inline.
- `LancamentoForm.tsx` — formulário reutilizável de receita/despesa (máscara BRL, parcelas).
- `pages/useCatalogo.ts` — hook que carrega categorias/formas/contas.
- `Graficos.tsx` — wrappers do recharts (`GraficoBarrasMensal`, `GraficoDonut`).
- `tema.tsx` — contexto de aparência (tema claro/escuro/sistema + largura fluida/fixa).

## Commits

Conventional commits em pt-BR (`feat(relatorios): ...`, `refactor: ...`).