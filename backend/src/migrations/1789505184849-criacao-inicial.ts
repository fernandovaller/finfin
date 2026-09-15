import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration inicial: assume o schema que antes era criado por `synchronize`.
 * - Banco novo: cria as 7 tabelas já com FKs e índices.
 * - Banco existente (da era synchronize): reconstrói tabela por tabela para
 *   adicionar as FKs, copiando os dados — SQLite não tem ADD CONSTRAINT.
 *
 * Ordem de processamento é importante: filhos por último. Assim nenhuma
 * `DROP TABLE` roda com outra tabela nova já apontando para ela
 * (`sessoes` só depois de `usuarios`; `receitas`/`despesas` só depois de `contas`).
 */
interface DefinicaoTabela {
  /** Colunas na ordem final — usadas para copiar só o que sobrevive no rebuild. */
  colunas: string[];
  /** Corpo do CREATE TABLE (sem "CREATE TABLE x"), com UNIQUEs e FKs. */
  corpo: string;
  /** FKs esperadas: [coluna, tabela referenciada]. Vazio = tabela raiz. */
  fks: Array<[string, string]>;
  /** Índices sobre as colunas de FK/consulta: [nome, coluna]. */
  indices: Array<[string, string]>;
}

const TABELAS: Record<string, DefinicaoTabela> = {
  usuarios: {
    colunas: ['id', 'nome', 'email', 'senhaHash', 'avatar', 'criadoEm'],
    corpo: `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "nome" varchar NOT NULL, "email" varchar NOT NULL, "senhaHash" varchar NOT NULL, "avatar" text, "criadoEm" varchar NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5" UNIQUE ("email")`,
    fks: [],
    indices: [],
  },
  categorias: {
    colunas: ['id', 'nome', 'tipo', 'cor', 'usuarioId'],
    corpo: `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "nome" varchar NOT NULL, "tipo" varchar NOT NULL, "cor" varchar NOT NULL DEFAULT ('slate'), "usuarioId" integer, CONSTRAINT "UQ_ff6c1fcf4624927cfa589df6f20" UNIQUE ("usuarioId", "nome", "tipo"), CONSTRAINT "FK_categorias_usuarios" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id")`,
    fks: [['usuarioId', 'usuarios']],
    indices: [['IDX_categorias_usuarios', 'usuarioId']],
  },
  formas_pagamento: {
    colunas: ['id', 'nome', 'usuarioId'],
    corpo: `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "nome" varchar NOT NULL, "usuarioId" integer, CONSTRAINT "UQ_8637523d58034a1c88909aee767" UNIQUE ("usuarioId", "nome"), CONSTRAINT "FK_formas_usuarios" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id")`,
    fks: [['usuarioId', 'usuarios']],
    indices: [['IDX_formas_usuarios', 'usuarioId']],
  },
  contas: {
    colunas: ['id', 'nome', 'saldoInicial', 'nota', 'icone', 'principal', 'usuarioId'],
    corpo: `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "nome" varchar NOT NULL, "saldoInicial" real NOT NULL DEFAULT (0), "nota" varchar NOT NULL DEFAULT (''), "icone" varchar NOT NULL DEFAULT (''), "principal" boolean NOT NULL DEFAULT (0), "usuarioId" integer, CONSTRAINT "UQ_5ba40a12dad67be3db12892b719" UNIQUE ("usuarioId", "nome"), CONSTRAINT "FK_contas_usuarios" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id")`,
    fks: [['usuarioId', 'usuarios']],
    indices: [['IDX_contas_usuarios', 'usuarioId']],
  },
  receitas: {
    colunas: ['id', 'data', 'valor', 'categoria', 'origem', 'formaPagamento', 'contaId', 'nota', 'usuarioId', 'fitid'],
    corpo: `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "data" varchar NOT NULL, "valor" real NOT NULL, "categoria" varchar NOT NULL, "origem" varchar NOT NULL, "formaPagamento" varchar NOT NULL DEFAULT (''), "contaId" integer, "nota" varchar NOT NULL DEFAULT (''), "usuarioId" integer, "fitid" varchar, CONSTRAINT "FK_receitas_contas" FOREIGN KEY ("contaId") REFERENCES "contas" ("id"), CONSTRAINT "FK_receitas_usuarios" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id")`,
    fks: [['contaId', 'contas'], ['usuarioId', 'usuarios']],
    indices: [['IDX_receitas_usuarios', 'usuarioId'], ['IDX_receitas_contas', 'contaId']],
  },
  despesas: {
    colunas: ['id', 'data', 'valor', 'categoria', 'descricao', 'formaPagamento', 'contaId', 'nota', 'grupoParcela', 'parcelaAtual', 'parcelaTotal', 'usuarioId', 'fitid'],
    corpo: `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "data" varchar NOT NULL, "valor" real NOT NULL, "categoria" varchar NOT NULL, "descricao" varchar NOT NULL DEFAULT (''), "formaPagamento" varchar NOT NULL DEFAULT (''), "contaId" integer, "nota" varchar NOT NULL DEFAULT (''), "grupoParcela" varchar, "parcelaAtual" integer, "parcelaTotal" integer, "usuarioId" integer, "fitid" varchar, CONSTRAINT "FK_despesas_contas" FOREIGN KEY ("contaId") REFERENCES "contas" ("id"), CONSTRAINT "FK_despesas_usuarios" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id")`,
    fks: [['contaId', 'contas'], ['usuarioId', 'usuarios']],
    indices: [['IDX_despesas_usuarios', 'usuarioId'], ['IDX_despesas_contas', 'contaId']],
  },
  sessoes: {
    colunas: ['token', 'usuarioId', 'expiraEm', 'criadoEm'],
    corpo: `"token" varchar PRIMARY KEY NOT NULL, "usuarioId" integer NOT NULL, "expiraEm" varchar NOT NULL, "criadoEm" varchar NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "FK_sessoes_usuarios" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE CASCADE`,
    fks: [['usuarioId', 'usuarios']],
    indices: [['IDX_sessoes_usuarios', 'usuarioId']],
  },
};

export class CriacaoInicial1789505184849 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [tabela, def] of Object.entries(TABELAS)) {
      if (!(await queryRunner.hasTable(tabela))) {
        await queryRunner.query(`CREATE TABLE "${tabela}" (${def.corpo})`);
      } else if (def.fks.length > 0 && !(await this.jaTemFks(queryRunner, tabela, def.fks))) {
        // Tabela da era synchronize: sem FK → reconstrói preservando os dados.
        await this.reconstruir(queryRunner, tabela, def);
      }
      for (const [nome, coluna] of def.indices) {
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "${nome}" ON "${tabela}" ("${coluna}")`);
      }
    }
    // Guarda: qualquer órfão preexistente derruba a migration (rollback total).
    const violacoes: unknown[] = await queryRunner.query(`PRAGMA foreign_key_check`);
    if (violacoes.length > 0) {
      throw new Error(
        `Linhas órfãs impedem as FKs: ${JSON.stringify(violacoes).slice(0, 200)} — limpe os dados antes de migrar`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const tabela of Object.keys(TABELAS).reverse()) {
      await queryRunner.query(`DROP TABLE IF EXISTS "${tabela}"`);
    }
  }

  /** A tabela já tem todas as FKs esperadas (migration idempotente)? */
  private async jaTemFks(
    queryRunner: QueryRunner,
    tabela: string,
    esperadas: Array<[string, string]>,
  ): Promise<boolean> {
    const atuais: Array<{ from: string; table: string }> = await queryRunner.query(
      `PRAGMA foreign_key_list("${tabela}")`,
    );
    return esperadas.every(([coluna, ref]) =>
      atuais.some((fk) => fk.from === coluna && fk.table === ref),
    );
  }

  /**
   * Rebuild estilo SQLite: cria `<tabela>_nova` com a definição final, copia
   * as colunas que sobrevivem (descarta colunas legadas), troca a tabela.
   * Colunas novas ausentes na origem saem nulas ou com o default da definição.
   */
  private async reconstruir(
    queryRunner: QueryRunner,
    tabela: string,
    def: DefinicaoTabela,
  ): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "${tabela}_nova"`);
    await queryRunner.query(`CREATE TABLE "${tabela}_nova" (${def.corpo})`);
    const atuais: Array<{ name: string }> = await queryRunner.query(
      `PRAGMA table_info("${tabela}")`,
    );
    const nomesAtuais = new Set(atuais.map((c) => c.name));
    const copiadas = def.colunas.filter((c) => nomesAtuais.has(c));
    const lista = copiadas.map((c) => `"${c}"`).join(', ');
    await queryRunner.query(
      `INSERT INTO "${tabela}_nova" (${lista}) SELECT ${lista} FROM "${tabela}"`,
    );
    await queryRunner.query(`DROP TABLE "${tabela}"`);
    await queryRunner.query(`ALTER TABLE "${tabela}_nova" RENAME TO "${tabela}"`);
  }
}