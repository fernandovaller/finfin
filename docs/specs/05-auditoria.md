# 05 — Auditoria

Controller `@Controller('auditoria')` com `AuthGuard` (`auditoria.controller.ts:6`).

## Registro (`auditoria.service.ts:51-66`)

- `registrar` nunca quebra o CRUD (try/catch silencioso).
- Limites: `modulo ≤ 40`, `acao ≤ 20`, `descricao ≤ 300`, `detalhes` JSON `≤ 8000`;
  `registroId` só se inteiro.
- Módulos (`auditoria.entity.ts:4-13`): `receitas, despesas, contas, categorias,
  formas-pagamento, auth, importacao, dados`.
- Ações (`:18-28`): `criar, atualizar, excluir, login, logout, importar, exportar,
  apagar, restaurar`.
- Exclusões guardam snapshot `antes` em `detalhes`; é o que permite restaurar.

## Rotas

- `GET /auditoria?modulo=&acao=&descricao=&dataInicio=&dataFim=&pagina=&porPagina=`
  (`auditoria.controller.ts:11-20` → `service.listar`).
- `DELETE /auditoria[?antesDe=YYYY-MM-DD]` (`:34`) → apaga tudo ou só o anterior
  (`service.limpar`).
- `POST /auditoria/:id/restaurar` (`:40`, `ParseIntPipe`) → recria o item excluído
  a partir do snapshot.

## Listagem (`:69-109`)

- Escopo `usuarioId` (`:84`). Filtros exatos `modulo, acao`; `descricao` via
  `LIKE %...%`; datas `YYYY-MM-DD` (`:91-96`).
- `pagina ≥ 1` default 1; `porPagina` 1–100 default 20 (`:79-81`); ordem `id DESC`.
- Retorna `{itens, total, pagina, porPagina, totalPaginas}`.

## Limpeza (`:112-122`)

`DELETE WHERE usuarioId`; se `antesDe` válido, `AND criadoEm < corte 00:00`.
Retorna `{excluidas}`. Formato inválido é ignorado (apaga tudo do usuário).

## Restauração (`:131-254`)

- Só evento do dono (senão 404, `:133`); só `acao === 'excluir'` (senão 400);
  `detalhes.antes` JSON obrigatório (senão 400). ID novo autoincrement.
- Categorias (`:147-165`): exige `nome+tipo`; duplicado 409.
- Formas (`:166-182`): exige nome; duplicado 409.
- Contas (`:183-207`): exige nome; `principal: false` forçado; duplicado 409.
- Receitas/despesas (`:208-250`): conta do snapshot precisa existir (senão 400);
  valida `data, valor > 0, categoria` (senão 400); receita `origem ?? categoria`,
  despesa `descricao ?? categoria`; `grupoParcela/parcela* = null` (vira avulsa).
  Audita `restaurar`.
- Outro módulo → 400 `Módulo ... não tem restauração` (`:252`).
