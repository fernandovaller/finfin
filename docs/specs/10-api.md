# 10 — Referência da API

Base `http://localhost:3001/api`. Protegidas exigem `Authorization: Bearer <token>`.

## Lançamentos e dados

| Método | Rota | Descrição |
|---|---|---|
| `GET`/`POST` | `/receitas` | lista (`?contaId=`) / cria |
| `PUT`/`DELETE` | `/receitas/:id` | edita / exclui (204) |
| `GET`/`POST` | `/despesas` | lista (`?contaId=`) / cria (até 21 parcelas) |
| `PUT`/`DELETE` | `/despesas/:id` | edita 1 item / exclui (`?escopo=grupo` p/ parceladas) |
| `GET` | `/resumo?mes=YYYY-MM&contaId=` | totais e saldo do mês |
| `GET` | `/contagem` | quantidades por coleção |
| `GET` | `/exportar`, `/exportar/csv?tipo=` | backup JSON / CSV (`tipo`: receitas\|despesas) |
| `POST` | `/importar`, `/importar/ofx` | restaura backup / importa extrato OFX |
| `DELETE` | `/dados/lancamentos`, `/dados/tudo` | apagão (mantém / apaga contas) |
| `GET`/`POST`/`DELETE` | `/dados/demonstracao` | status / gera (409 se existe) / remove demo |

## Catálogo

| Método | Rota | Descrição |
|---|---|---|
| `GET`/`POST` | `/contas` | lista / cria |
| `PUT`/`DELETE` | `/contas/:id` | edita / exclui 204 (409 em uso) |
| `GET`/`POST` | `/categorias[?tipo=]` | lista com filtro / cria |
| `PUT`/`DELETE` | `/categorias/:id` | edita / exclui 204 (409 em uso) |
| `GET`/`POST` | `/formas-pagamento` | lista / cria |
| `PUT`/`DELETE` | `/formas-pagamento/:id` | edita / exclui 204 (409 em uso) |
| `POST` | `/restaurar` | repõe itens padrão faltantes |

## Auth, auditoria

| Método | Rota | Descrição |
|---|---|---|
| `POST`/`GET` | `/auth/cadastro`, `/auth/login`, `/auth/eu` | cria conta / entra / sessão atual (eu nunca 401) |
| `POST` | `/auth/logout` | encerra a sessão (204) |
| `PUT` | `/auth/perfil`, `/auth/senha` | atualiza perfil / troca senha (derruba outras sessões) |
| `GET`/`PUT` | `/auth/integracoes` | status / salva chave Resend |
| `POST` | `/auth/recuperar-senha`, `/auth/redefinir-senha` | recuperação por e-mail (sempre `{ok: true}`) |
| `GET` | `/auditoria?modulo=&acao=&descricao=&dataInicio=&dataFim=&pagina=&porPagina=` | trilha paginada (20/pág, máx 100) |
| `POST` | `/auditoria/:id/restaurar` | restaura item excluído do snapshot |
| `DELETE` | `/auditoria[?antesDe=YYYY-MM-DD]` | limpa trilha |

Exemplo (cadastro → despesa):

```sh
TOKEN=$(curl -s -X POST localhost:3001/api/auth/cadastro \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Demo","email":"demo@exemplo.com","senha":"segredo123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

curl -X POST localhost:3001/api/despesas \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"data":"2026-09-15","valor":120,"categoria":"Lazer e entretenimento","descricao":"Cinema","formaPagamento":"⚡ Pix","contaId":1}'
```
