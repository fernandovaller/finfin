# 09 — Componentes, parser OFX, tema

## `LancamentoForm.tsx` — form receita/despesa

Props (`:17-29`): `tipo, onTipoChange?, categoriasReceita/Despesa: string[], formas:
string[], contas: Conta[], initial?, submitLabel, submitting, onSubmit, onErro`.
`LancamentoValues` (`:6-15`): `{data, valor, categoria, origem, formaPagamento,
contaId: number | '', nota, parcelas}`.

- Máscara `mascaraMoeda` (`:32-38`): dígitos → centavos → pt-BR 2 casas. Input
  `type=text inputMode=numeric`, só dígitos slice 12, prefixo `R$`. Submit converte
  `Number/100`.
- Defaults: `data` hoje; `categoria opcoes[0]`; `contaId` principal ou primeira.
  Effects re-sincronizam categoria/conta quando o catálogo async chega; preserva
  categoria histórica (`:102-103`). Toggle tipo só na criação (`onTipoChange`).
- Parcelas: só criação de despesa (`despesa && !initial?.categoria`, `:83`). Input
  1–21 + prévia valor/parcela. Submit sempre envia `parcelas` (1 se oculto).
- Validações (`:111-131`, via `onErro`): `valor > 0`, categoria, `contaId !== ''`,
  parcelas. Conta select com `★ principal`; origem required só receita; forma opcional
  `Não informada`.

## `ofx.ts` — parser (`:21-53`)

`OfxItem`: `{fitid, data ISO, valor > 0, tipo, descricao}`. `tag` regex `<NOME>([^<\r\n]*)`
case-insensitive. Exige `<OFX>`; split `<STMTTRN>`; `DTPOSTED` → `YYYY-MM-DD`;
`TRNAMT` (`,` → `.`), pula NaN/0; sinal → tipo; `MEMO || NAME || 'Lançamento OFX'`
slice 200; dedup `FITID` intra-arquivo; sort por data.

## `Graficos.tsx` — recharts

`PontoMensal{mes, rotulo, receitas, despesas}`, `FatiaCategoria{nome, cor, total}`.
`GraficoBarrasMensal` (`:58-79`): `h-240px`, `barGap 4`, grid só horizontal, `YAxis`
oculto, tooltip BRL custom, 2×`Bar maxBarSize 26 radius`. `GraficoDonut` (`:93-154`):
total 0 → `Sem despesas`; top 7 + `Outras (slate)`; `Pie inner 68% outer 95%
paddingAngle 2`; centro total; legenda % + valor.

## `ui.tsx` — primitivas

- Formatação (`:5-27`): `BRL` (Intl pt-BR), `mesAtual`, `mesLabel` (long pt-BR),
  `deslocarMes`, `formatarData` (ISO → DD/MM), `pluralLancamentos`.
- Cores (`:31-67`): `COR_MAP` badge light/dark, `COR_SWATCH` dot, `BadgeCategoria`.
- Ícones SVG stroke (`:71-167`): Casa, Extrato, Grafico, Tag, Carteira, Seta, Lapiz,
  Lixeira, Upload, Usuario, Engrenagem. `TituloPagina` (`:171-186`).
- `Avatar` (`:190-236`): iniciais 1–2 letras, cor por hash `% 8`, tamanhos sm|md|lg.
- `MesNav` (`:240-267`): `‹ input month ›`. `AlertaErro`, `Modal` (wide?sm, backdrop
  fecha), `ConfirmarExclusao`, `StatusSync` (Sincronizando/Falha/HH:MM).
- `ResumoMes.tsx:12-59`: 3 cards `{resumo, carregando, mes, qtdReceitas, qtdDespesas}`;
  `...` carregando senão BRL; saldo verde/vermelho por `>= 0`.

## `tema.tsx` — aparência

Tipos `Tema = claro|escuro|sistema`, `Largura = fluida|fixa` (`:3-4`); chaves
`finfin_tema/finfin_largura`; defaults `sistema/fluida`. `matchMedia` p/ escuro;
`aplicar` alterna `documentElement.dark` + `dataset.largura`. Listener `change` só em
`sistema`. `index.css`: variante dark por `.dark`; `data-largura=fixa` centra
`main max-width 64rem`.

## Build (`vite.config.ts`, `package.json`)

`tailwindcss()` plugin; `BACKEND_PORT → 3001, FRONTEND_PORT → 3000`; `server.port` +
proxy `/api`; `preview.port`. Deps: react 19, router 7, recharts 3, tailwind 4;
scripts `dev / build (tsc -b && vite build) / preview`; sem test/lint.
