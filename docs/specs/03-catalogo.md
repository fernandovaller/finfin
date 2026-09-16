# 03 — Catálogo: categorias, formas, contas

Todo `CatalogoController` usa `AuthGuard` na classe
(`backend/src/catalogo.controller.ts:6`). DELETEs retornam 204 (`:25,:46,:67`).
Exclusão em uso retorna 409. Toda mutação é auditada.

## Rotas

| Recurso | Rotas |
|---|---|
| Categorias | `GET /categorias[?tipo=receita\|despesa]` (`:10`), `POST /categorias {nome,tipo,cor}` (`:15`), `PUT /categorias/:id` (`:20`), `DELETE /categorias/:id` (`:25`) |
| Formas | `GET /formas-pagamento` (`:31`), `POST` (`:36`), `PUT /:id` (`:41`), `DELETE /:id` (`:46`) |
| Contas | `GET /contas` (`:52`), `POST` (`:57`), `PUT /:id` (`:62`), `DELETE /:id` (`:67`) |
| Seed | `POST /restaurar` sem body (`:73`) → repõe itens padrão faltantes |

## Categorias (`catalogo.service.ts`)

- Seeds: 13 (`SEED_CATEGORIAS`, 10 despesa + 3 receita, `:16-30`). Cores válidas:
  `sky, violet, amber, pink, emerald, teal, rose, slate` (`categoria.entity.ts:5-14`).
- Create (`:70-93`): `nome` trim obrigatório, `tipo` receita|despesa, `cor` no enum,
  senão 400. Unique `(usuarioId, nome, tipo)` → 409.
- Update (`:96-137`): 404 se não é do dono. `nome/cor` opcionais, vazio/inválida 400.
  Renomear propaga via `UPDATE SET categoria WHERE usuarioId AND categoria=antigo`
  na tabela do tipo (`:114-124`). Conflito → 409.
- Delete (`:139-157`): 404 se não é do dono. `countBy({categoria: nome, usuarioId}) > 0`
  → 409 `Categoria em uso em N lançamento(s)`.

## Formas de pagamento

- Seeds: 7 (`SEED_FORMAS`, `:32-40`). Sem filtro por tipo.
- Create (`:163-178`): `nome` obrigatório, senão 400. Unique `(usuarioId, nome)` → 409.
- Update (`:181-223`): 404 se não é do dono. Renomear propaga para receitas+despesas
  (`:194-211`). Conflito → 409.
- Delete (`:225-246`): soma `countBy formaPagamento` em receitas+despesas (`:228-231`);
  `> 0` → 409.

## Contas (`:252-352`)

- Create (`:252-278`): `nome` obrigatório; `saldoInicial` number (`NaN` 400);
  `nota/icone` string; `principal === true` marca principal. Unique
  `(usuarioId, nome)` → 409. `marcarPrincipal` desmarca as outras
  (`UPDATE principal=false WHERE usuarioId AND id != id`, `:322-329`).
- Update (`:280-319`): mesma validação por campo + 404; nome duplicado 409.
- Delete (`:331-352`): 404 se não é do dono. `countBy contaId` em receitas+despesas
  `> 0` → 409 `Conta em uso...`; senão deleta.
- Entidade (`conta.entity.ts`): `saldoInicial real default 0`, `principal false`,
  `demo false`, unique `(usuarioId, nome)`.

## Restaurar padrão (`:358-383`)

Insere só seeds ausentes (por `tipo:nome` / nome). Retorna `{categorias, formas}`.
Audita `dados/restaurar` só se inseriu algo (`:374-381`).
