# 02 — Backend: lançamentos, resumo, contagem

Todo `AppController` usa `@UseGuards(AuthGuard)` na classe
(`backend/src/app.controller.ts:6`). `usuarioId = req.usuario.id` em todas as rotas.

## Receitas

- `POST /receitas` (`app.controller.ts:10`) → `createReceita`.
- `GET /receitas?contaId=` (`:15`) → lista, filtro opcional por conta.
- `PUT /receitas/:id` (`:27`) → edita um item (body completo exigido).
- `DELETE /receitas/:id` 204 (`:21`) → exclui um item.

Regras (`app.service.ts`):

- `assertLancamento` (`:12-21`): campos presentes/não-vazios + `valor: number > 0`, senão 400.
- Receita exige `[data, valor, categoria, origem]` (`:66,:152`).
- `assertConta` (`:56-63`): `contaId` inteiro + pertence ao usuário, senão 400.
- Update/delete buscam por `{id, usuarioId}`; dono divergente → 404
  (`:154-155,:180-181,:216-217`).
- Exclusão audita `receitas/excluir` com snapshot `antes` (`:219-225`).

## Despesas e parcelas

- `POST /despesas` (`:32`) → cria 1 ou N (campo `parcelas` 1–21).
- `GET /despesas?contaId=` (`:37`) → lista.
- `PUT /despesas/:id` (`:52`) → edita só 1 item, nunca re-parcelar (`:177-201`).
- `DELETE /despesas/:id[?escopo=grupo]` 200 (`:43`) → sem escopo apaga 1;
  com `escopo=grupo` apaga a parcela toda (`:233-247`, retorna `{excluidas}`).
  Sem `grupoParcela`, apaga 1 mesmo com escopo (`:237`).

Desdobro (`:116-149`):

- `grupoParcela = randomUUID()` (`:117`).
- Descrição `"base (n/N)"` (`:129`), competência `somarMeses(data, i)` em UTC
  preservando o dia (`:32-37,:126`).
- Rateio em centavos: `total = round(v*100)`, `base = floor(total/N)`, resto todo
  na última parcela (`:119-124`). Ex.: 100/3 → 33.33, 33.33, 33.34.
- Campos `parcelaAtual/Total` setados; avulsa tem `null` (`:102-104`).
- `assertParcelas` (`:23-29`): inteiro 1–21, senão 400.
- Despesa exige `[data, valor, categoria]` (`:89,:178`).

## Resumo e contagem

- `GET /resumo?mes=YYYY-MM&contaId=` (`:57`) → `{mes, totalReceitas, totalDespesas, saldo}`.
  `mes` default = mês atual (`:274`); filtra `data.startsWith(ref)` em memória (`:282-286`).
- `GET /contagem` (`:63`) → `countBy({usuarioId})` de contas, receitas, despesas,
  categorias e formas (`:291-306`).

## Apagão

- `DELETE /dados/lancamentos` (`:88`) → apaga receitas+despesas, mantém catálogo e
  contas. Retorna `{receitas, despesas}` + auditoria `dados/apagar` (`:380-393`).
- `DELETE /dados/tudo` (`:93`) → além disso apaga contas. Mantém catálogo, perfil e
  auditoria (`:396-410`).
