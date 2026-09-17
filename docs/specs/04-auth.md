# 04 — Auth: cadastro, sessão, perfil, recuperação

Base `auth.controller.ts` = `@Controller('auth')` (`:6`).

## Senha e sessão (`auth.service.ts`)

- Hash `scrypt(senha, salt16, 64)` formato `salt:hash` hex (`:89-93`); confere com
  `timingSafeEqual` (`:95-102`).
- Sessão em par: access `randomBytes(32).hex` TTL 15 min (Bearer, só em memória no
  frontend) + refresh `randomBytes(32).hex` TTL 7 dias rotativo (cookie HttpOnly
  `finfin_refresh`, `Path=/api/auth`, `SameSite=Strict`). Tabela `sessoes`
  (`token` PK, `usuarioId`, `expiraEm`, `criadoEm`, `tipo: access|refresh|null`,
  `refreshToken` — access aponta para o refresh que o gerou). Legado (`tipo` NULL,
  era do localStorage) vale como access até expirar.
- `onModuleInit` limpa expiradas (`:153-155`).
- `donoDoToken`: parse Bearer; refresh nunca autentica rota; expirado → deleta + `null`.
- `refreshSessao`: valida o refresh do cookie, rotaciona (apaga refresh antigo + seus
  access) e emite par novo. `logout(access?, refresh?)`: apaga o access, o refresh e
  os access dele + limpa o cookie.
- `AuthGuard` (`auth.guard.ts:5-14`): sem dono válido → 401 `Sessão inválida ou expirada`.

## Rotas

| Rota | Acesso | I/O |
|---|---|---|
| `POST /auth/cadastro` | pública, `@Limite(10)/min` | `{nome, email, senha}` → `{usuario, token, expiraEm}` + cookie refresh |
| `POST /auth/login` | pública, `@Limite(10)` | `{email, senha}` → `{usuario, token, expiraEm}` + cookie refresh + auditoria `auth/login` |
| `POST /auth/refresh` | pública (cookie), `@Limite(30)` | rotaciona refresh → `{usuario, token, expiraEm}` + cookie novo |
| `POST /auth/logout` 204 | pública, lê Bearer + cookie | apaga access/refresh + limpa cookie + auditoria |
| `GET /auth/eu` (`:30`) | pública, `donoDoToken` manual (`:32`) | `{usuario \| null}` — nunca 401 |
| `PUT /auth/perfil` (`:39`) | `AuthGuard` | `{nome?, email?, avatar?}` → `{usuario}` |
| `PUT /auth/senha` (`:45`) | `AuthGuard`, extrai `tokenAtual` (`:48`) | `{senhaAtual, novaSenha}` → revoga outras sessões |
| `GET /auth/integracoes` (`:52`) | `AuthGuard` | status Resend mascarado |
| `PUT /auth/integracoes` (`:58`) | `AuthGuard` | `{resendApiKey}` |
| `POST /auth/recuperar-senha` (`:65`) | pública, `@Limite(5)` | `{email}` → sempre `{ok: true}` |
| `POST /auth/redefinir-senha` (`:72`) | pública, `@Limite(5)` | `{token, novaSenha}` → `{ok: true}` |

## Regras

- Cadastro (`:157-179`): `nome` obrigatório; `email` normalizado lower + regex 400
  (`:104-108`); `senha` 8–128 (teto anti-DoS scrypt, `:166-168`); duplicado 409.
- `adotarOuSemear` (`:446-469`): se 1º usuário do sistema, adota órfãos
  (`usuarioId IS NULL` nas 5 tabelas, `:450-455`); senão seed 13 categorias + 7 formas
  + `Conta Principal {saldo 0, ícone 💰, principal: true}` (`:472-483`).
- Login (`:181-198`): sem `email+senha` 400; usuário/senha inválidos 401.
- Perfil (`:214-255`): 401 sem usuário; `nome` não-vazio, `email` regex + único (409),
  `avatar` null ou `data:image/(png|jpg|gif|webp);base64` com `≤ 500k chars` (~375KB),
  senão 400 (`:236-244`). Audita `auth/atualizar`.
- Senha (`:258-288`): `senhaAtual` errada 401; `novaSenha` 8–128 senão 400; re-hash +
  `delete({usuarioId, token: Not(tokenAtual)})` — mantém a atual, derruba o resto.
- Integrações (`:294-331`): `obter` retorna `{email: {configurado, origem: conta|ambiente|null, mascarada}}`;
  máscara `aaa…zzzz` ou `••••` (`:80-83`); chave da conta sobrepõe `RESEND_API_KEY`.
  `salvar` aceita `null|''` (limpa) ou 10–500 chars, senão 400.

## Recuperação de senha (`:338-393`)

- `solicitar`: limpa expiradas, anti-enumeração (sempre `{ok: true}`), sem chave Resend
  só loga warn sem enviar. Invalida pendentes, guarda só `sha256(token)` (`:353`),
  TTL 1h uso único. Link `${FRONTEND_URL}/#/redefinir-senha?token=`.
- Envio via Resend (`:407-433`), remetente `EMAIL_REMETENTE || onboarding@resend.dev`;
  erro de envio só loga.
- `redefinir`: `token` obrigatório + `novaSenha` 8–128 senão 400; hash inválido, usado,
  expirado ou sem usuário → 400 `Token inválido ou expirado`; re-hash, marca
  `usadoEm`, deleta **todas** as sessões do usuário.
