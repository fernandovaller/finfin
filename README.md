# FinFin — Financeiro Pessoal

Tracker de finanças pessoais em português: registre receitas e despesas, organize por
categorias e formas de pagamento, e acompanhe o saldo mês a mês com relatórios.

Projeto de portfólio com backend e frontend em TypeScript.

## Stack

| Camada   | Tecnologia                                                        |
| -------- | ----------------------------------------------------------------- |
| Backend  | NestJS 10 + TypeScript + TypeORM + SQLite (`better-sqlite3`)      |
| Frontend | React 19 + Vite 6 + TypeScript + Tailwind CSS v4 + React Router   |
| Banco    | SQLite em arquivo (`backend/data/finfin.sqlite`, criado no boot)  |

## Funcionalidades

- **Home** — resumo do mês (receitas, despesas, saldo), barra de proporção e atividade recente
- **Lançamentos** — criar, editar e excluir receitas/despesas, com máscara de moeda BRL (R$)
- **Relatórios** — totais do mês, despesas por categoria e por forma de pagamento, últimos 6 meses
- **Categorias** — CRUD com tipo (receita/despesa) e cor; exclusão bloqueada se estiver em uso
- **Formas de pagamento** — CRUD (Dinheiro, PIX, cartões…); exclusão bloqueada se estiver em uso

## Como rodar

Pré-requisito: Node.js 20+.

```sh
npm run setup   # instala as dependências (raiz + backend + frontend)
npm run dev     # sobe backend (:3001) + frontend (:3000) juntos
```

Abra http://localhost:3000 no navegador.

> **Portas**: copie `.env.example` para `.env` e ajuste `BACKEND_PORT` /
> `FRONTEND_PORT` se 3000/3001 estiverem em uso. Vale para `npm run dev`
> e para o Docker (só a porta do host muda; dentro dos contêineres o
> backend segue na 3001 e o frontend na 80).

| Comando              | O que faz                                        |
| -------------------- | ------------------------------------------------ |
| `npm run dev`        | backend (watch) + frontend juntos                |
| `npm run dev:backend`| só o backend — http://localhost:3001/api/resumo |
| `npm run dev:frontend`| só o frontend — http://localhost:3000           |
| `npm run build`      | build do backend e do frontend                   |

As chamadas do frontend usam `/api/...`, com proxy do Vite para o backend em dev.

## Como rodar com Docker

Pré-requisito: Docker 24+ com plugin Compose (`docker compose version`).

```sh
docker compose up --build   # sobe backend (:3001) + frontend (:3000)
```

Abra http://localhost:3000 no navegador. O nginx do frontend faz proxy de
`/api/...` para o serviço `backend`, então é a mesma origem do `npm run dev`.

| Comando                          | O que faz                                  |
| -------------------------------- | ------------------------------------------ |
| `docker compose up --build`      | constrói as imagens e sobe os 2 serviços   |
| `docker compose up -d`           | sobe em segundo plano (após o 1º build)    |
| `docker compose logs -f`         | acompanha os logs dos 2 serviços           |
| `docker compose down`            | para e remove os contêineres (mantém dados)|

Os dados do SQLite ficam no volume `finfin-data` (`/app/data` no contêiner do
backend). Para recomeçar do zero, apague o volume:

```sh
docker compose down -v   # CUIDADO: apaga todos os lançamentos
```

## API

Base: `http://localhost:3001/api`

| Método          | Rota                          | Descrição                              |
| --------------- | ----------------------------- | -------------------------------------- |
| `GET` / `POST`  | `/receitas`                   | lista / cria receitas                  |
| `PUT` / `DELETE`| `/receitas/:id`               | edita / exclui receita                 |
| `GET` / `POST`  | `/despesas`                   | lista / cria despesas                  |
| `PUT` / `DELETE`| `/despesas/:id`               | edita / exclui despesa                 |
| `GET`           | `/resumo?mes=YYYY-MM`         | totais e saldo do mês                  |
| `GET` / `POST`  | `/categorias[?tipo=despesa]`  | lista (com filtro) / cria categorias   |
| `PUT` / `DELETE`| `/categorias/:id`             | edita / exclui (409 se estiver em uso) |
| `GET` / `POST`  | `/formas-pagamento`           | lista / cria formas de pagamento       |
| `PUT` / `DELETE`| `/formas-pagamento/:id`       | edita / exclui (409 se estiver em uso) |

Exemplo:

```sh
curl -X POST localhost:3001/api/despesas \
  -H 'Content-Type: application/json' \
  -d '{"data":"2026-09-15","valor":120,"categoria":"Desejos","descricao":"Cinema","formaPagamento":"PIX"}'
```

## Estrutura

```
finfin/
├── backend/        # NestJS — controllers, services, entidades TypeORM (+ Dockerfile)
├── frontend/       # React — Layout com sidebar, páginas, form reutilizável (+ Dockerfile e nginx.conf)
├── docker-compose.yml # backend (:3001) + frontend (:3000), volume finfin-data
├── PLAN.md         # especificação do produto (origem do projeto)
└── package.json    # runner raiz (concurrently): dev, build, setup
```

## Notas

- Os dados ficam no SQLite local — nada sai da sua máquina.
- `synchronize: true` do TypeORM cria as tabelas automaticamente (adequado para dev;
  trocar por migrations antes de qualquer uso em produção).
- Rode apenas uma instância do backend por vez sobre o mesmo arquivo `.sqlite`.

## Licença

MIT — veja [LICENSE](LICENSE).
