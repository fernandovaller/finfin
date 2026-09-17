# 08 — Frontend: rotas, shell, páginas

## Roteamento e guarda (`frontend/src/main.tsx:39-63`)

`HashRouter`. Públicas (fora `RotaProtegida`): `/login`, `/recuperar-senha`,
`/redefinir-senha`. Protegidas (pai `RotaProtegida > Layout > Outlet`):

`/` Home, `/lancamentos`, `/lancamentos/ofx`, `/relatorios`, `/categorias`,
`/contas`, `/formas-pagamento`, `/auditoria`, `/configuracoes`, `/perfil`, `*` → `/`.

`RotaProtegida` (`:22-33`): `carregando` → `Carregando...`; sem usuário →
`<Navigate to="/login" replace />`. Provedores: `ProvedorAparencia > AuthProvider >
HashRouter` (`:37-38`), `StrictMode` (`:36`).

## Sessão (`auth.tsx`, `api.ts`)

- Access (15 min) só em memória (`api.ts`); refresh (7 dias) em cookie HttpOnly
  `finfin_refresh` que o JS não lê. Nada de token em `localStorage`.
- Boot: `refreshAccess()` reconstrói o access via `POST /api/auth/refresh`, depois
  `GET /api/auth/eu` (`auth.tsx`).
- `entrar/criarConta` fazem `clearToken()` antes (401 vira erro de credenciais, não
  "sessão expirada"), depois `setToken + setUsuario`.
- `api(path, init)` usa `credentials: include` e injeta Bearer da memória; 401 em rota
  protegida → 1 refresh + 1 retry; se falhar → `clearToken()` + throw
  `Sessão expirada...`. Rotas `/api/auth/login|cadastro|refresh|recuperar|redefinir|logout`
  nunca disparam refresh (propagam o erro real). Renovação concorrente compartilha
  uma única promise (`refreshEmVoo`).
- `sair`: `apiLogout()` + `clearToken()` em `finally` + `setUsuario(null)`.
  `sincronizar(u)` atualiza após PUT perfil/senha. Layout: `onSair → sair() + navegar('/login')` (`Layout.tsx:86-89`).

## Shell (`Layout.tsx`)

Grupos: Principal (`/`, `/lancamentos`, `/relatorios`), Cadastros (`/categorias`,
`/contas`, `/formas-pagamento`), Sistema (`/configuracoes`, `/auditoria`) (`:14-38`).
Sidebar desktop fixa `w-64 bg-slate-900` (`:94`); drawer mobile (`:128-170`); header
mobile (`:173-185`); conteúdo `<Outlet />` em `.area-app lg:pl-64`. Rodapé com
`Avatar`, link `/perfil`, botão `Sair`.

## Catálogo (`pages/useCatalogo.ts:5-54`)

`GET /api/categorias|formas-pagamento|contas` (contas com `.catch(() => [])`).
Helpers: `nomesPorTipo`, `corDe → cor | 'slate'`, `contaPorId → nome | ''`,
`contaPrincipal`. Usado por Home, Lançamentos, Relatórios, ImportarOfx.

## Páginas

- `/` `Home.tsx:28-305`: `Promise.all` receitas+despesas+`resumo?mes=&contaId=`;
  recarrega a cada `mes, contaFiltro`. Deriva client: filtro mês+conta, recentes top 8,
  evolução 6 meses, donut, `saldoAtual = saldoInicial + rec − des` por conta.
  Seções: `MesNav`, filtro conta, `ResumoMes`, Contas, `GraficoBarrasMensal`,
  `GraficoDonut`, Atividade recente.
- `/lancamentos` `Lancamentos.tsx:26-438`: `GET` receitas+despesas no mount; filtro
  mês+conta sort desc. `POST /api/receitas|despesas` (origem→origem|descricao,
  `parcelas` só despesa), `PUT /<kind>s/:id`, `DELETE`. Despesa parcelada: modal
  `Só esta | Todas (?escopo=grupo)`. Modais novo/edição/`ConfirmarExclusao`.
- `/relatorios` `Relatorios.tsx:69-656`: `GET` receitas+despesas uma vez. Filtros:
  preset `mes|6m|12m|ano|intervalo`, mês/ano/ini/fim, conta, catRec/catDes, forma,
  busca, min/max (`parseValorBR`: `.` milhar, `,` decimal). Agregados: total/ticket,
  por categoria/forma/conta, top 5, evolução com acumulado. `Exportar PDF` gera HTML +
  `window.open + print()`.
- `/lancamentos/ofx` `ImportarOfx.tsx:22-342`: defaults (conta principal, cats, forma).
  `file.text() → parseOfx → Linha{item, incluir, tipo, categoria}`. Prévia com checkbox,
  toggle tipo, select categoria por linha. `POST /api/importar/ofx` mostra
  `{receitas, despesas, ignorados}`.
- `/categorias` `Categorias.tsx:18-339`: `GET /api/categorias`; aba despesa|receita;
  `POST {nome, tipo, cor}`, `PUT {nome, cor}` (tipo imutável), `DELETE`. Picker
  `CORES_CATEGORIA` (8 cores).
- `/contas` `Contas.tsx:19-361`: `GET /api/contas`; `POST/PUT {nome, saldoInicial,
  nota, icone, principal}`; `DELETE`. Ícones emoji, fallback 💰, badge Principal.
- `/formas-pagamento` `FormasPagamento.tsx:14-252`: CRUD só `{nome}`.
- `/configuracoes` `Configuracoes.tsx:52-727`: 4 abas (geral, backup, email, perigo).
  Geral: `GET /api/contagem` + aparência. Backup: demo (`POST|DELETE
  /api/dados/demonstracao`), export JSON (`GET /api/exportar` → `finfin-backup-*.json`)
  e CSV (`GET /api/exportar/csv?tipo=` + BOM), import (`POST /api/importar
  {modo: mesclar|substituir, backup}` + checkbox), `POST /api/restaurar`. E-mail:
  `GET|PUT /api/auth/integracoes {resendApiKey}`. Perigo: exige digitar `APAGAR`,
  `DELETE /api/dados/lancamentos|/tudo`.
- `/auditoria` `Auditoria.tsx:50-317`: `GET /api/auditoria?modulo&acao&descricao&
  dataInicio&dataFim&pagina&porPagina` (20/pág). Filtros grid, modal detalhe JSON,
  `POST /api/auditoria/:id/restaurar` (só excluir + módulo restaurável),
  `DELETE /api/auditoria` com modal.
- `/login` `Login.tsx:8-145` (pública): modos entrar|criar; submit → `/`.
  Link `Esqueci a senha → /recuperar-senha`.
- `/recuperar-senha` `RecuperarSenha.tsx`: `POST` e mensagem genérica anti-enumeração.
- `/redefinir-senha` `RedefinirSenha.tsx`: `token` via query; valida confirmação;
  3 estados (sem token / pronto / form 8–128).
- `/perfil` `Perfil.tsx:8-177`: `PUT atualizarPerfil{ nome, email, avatar}` +
  `sincronizar`; avatar `dataURL ≤ 500k` (`image/*`); `PUT trocarSenha` + limpa campos.
