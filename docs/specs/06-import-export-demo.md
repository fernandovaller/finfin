# 06 — Import, export e demonstração

Todas as rotas abaixo usam `AuthGuard` e escopo `usuarioId`.

## Backup JSON

- `GET /exportar` (`app.controller.ts:68`) → `{app: 'finfin', versao: 1, exportadoEm,
  contas, receitas, despesas, categorias, formasPagamento}` ordenado `id ASC`
  (`app.service.ts:309-332`). Audita `dados/exportar`.
- `POST /importar {modo, backup}` (`:78`) → transacional (`:571`).
  - `modo` mesclar|substituir (`:551-554`); `backup.app === 'finfin'` (`:559-561`);
    listas arrays `≤ 2000` (`:562-570`).
  - `substituir` deleta despesas+receitas+contas antes (`:573-575`).
  - Categorias dedup por `(usuarioId, nome, tipo)` (`:578-589`); formas por nome
    (`:591-601`); contas por nome com `mapaContas idAntigo → idNovo` (`:602-627`),
    `saldoInicial Number || 0`, segunda `principal` vira `false`.
  - Lançamento com conta não mapeada → 400 `...referencia conta inexistente`.
    Receita exige `data, valor > 0, categoria, origem`; despesa `data, valor > 0,
    categoria`. Preserva `grupoParcela/parcela*` (`:667-669`).
  - Retorna `{modo, categorias, formasPagamento, contas, receitas, despesas}`.

## CSV

- `GET /exportar/csv?tipo=receitas|despesas` (`:73`) → separador `;`
  (`app.service.ts:335-377`). Escape `"` → `""` + quote se `[;"\n]`; prefixo `'`
  anti-fórmula em `^[=+\-@\t\r]` (`:339-344`).
- Header receitas: `id,data,valor,categoria,origem,formaPagamento,contaId,nota`;
  despesas adiciona `descricao,grupoParcela,parcelaAtual,parcelaTotal`.
  `tipo` inválido → 400. Audita `dados/exportar`.

## OFX

- Parser vive no frontend (`frontend/src/ofx.ts:21-53`): exige `<OFX>`; split por
  `<STMTTRN>`; `DTPOSTED` → `YYYY-MM-DD`; `TRNAMT` (`,` → `.`), pula NaN/0;
  sinal → tipo; `abs round 2`; `MEMO || NAME || 'Lançamento OFX'` (slice 200);
  `FITID || null` com dedup intra-arquivo; sort por data.
- `POST /importar/ofx {contaId, categoriaReceita, categoriaDespesa, formaPagamento?, itens[]}`
  (`:83`), transacional (`app.service.ts:478`).
  - Conta válida (`:423`); categorias default obrigatórias (`:426-427`); forma, se dada,
    precisa existir (`:430-433`); `itens` array 1–2000 (`:435-440`).
  - Por item: `data YYYY-MM-DD` regex, `valor round 2 casas > 0`, `tipo receita|despesa`,
    categoria default por tipo, `descricao trim slice 200`, `fitid trim slice 100 | null`.
  - Categorias usadas precisam existir com o tipo correto, senão 400.
  - Ignora repetido no banco (`fitid IN`, `:483-486`) ou no lote (`Set`, `:492-498`).
    Receita salva `{origem: descricao || categoria}`; despesa sem parcela.
  - Retorna `{receitas, despesas, ignorados}` + auditoria `importacao/importar`.

## Demonstração

- `GET /dados/demonstracao` (`:98`) → `{existe, contas, receitas, despesas}`.
- `POST /dados/demonstracao` (`:103`) → gera; 409 se já existe (`:774`).
- `DELETE /dados/demonstracao` (`:108`) → remove só `demo = true` das 3 tabelas.
- Geração (`:769-893`): 3 contas `demo: true, principal: false`; usa cats/forma do
  usuário ou fallback; 6 meses (5 anteriores + atual); despesas `catDesp × 3 contas × 6m`
  + 1 receita/conta/mês (Salário etc.); + 1 parcelado `3x R$ 900 "Notebook demo (n/3)"`
  por conta. RNG com seed 42 (determinístico, `:740-749`). Audita `dados/importar`.
