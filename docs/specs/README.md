# Specs do FinFin

Inventário fiel do comportamento atual do código (set/2026). Sem proposta de futuro, sem TODO.

## Mapa

| Arquivo | Assunto |
|---|---|
| `01-visao-geral.md` | Produto, stack, portas, convenções, multiusuário |
| `02-backend.md` | Módulo único, guards, lançamentos, resumo, contagem, apagão |
| `03-catalogo.md` | Categorias, formas de pagamento, contas, seeds, regra 409 |
| `04-auth.md` | Cadastro, login, sessões, perfil, senha, Resend, recuperação |
| `05-auditoria.md` | Trilha, filtros, paginação, restauração, limpeza |
| `06-import-export-demo.md` | Backup JSON, CSV, OFX, demonstração |
| `07-infra.md` | Boot, CORS, migrations, entidades |
| `08-frontend.md` | Rotas, shell, sessão, catálogo, páginas |
| `09-componentes.md` | Form, OFX parser, gráficos, primitivas UI, tema |
| `10-api.md` | Referência de rotas HTTP |

## Como ler

- Backend: `backend/src` flat, sem módulos por feature. Tudo no `AppModule`.
- Frontend: `frontend/src`, `HashRouter`, `api.ts` é o único ponto de rede.
- Toda rota protegida exige `Authorization: Bearer <token>` e escopa por `usuarioId`.
- Validação é manual nos services (`BadRequestException`), sem class-validator/DTOs.
