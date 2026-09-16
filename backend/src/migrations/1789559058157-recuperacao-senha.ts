import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Tabela de pedidos de recuperação de senha: token guarda só o hash
 * SHA-256 (uso único, expiração curta). FK com CASCADE: apagar o usuário
 * limpa os pedidos pendentes dele.
 */
export class RecuperacaoSenha1789559058157 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "recuperacoes_senha" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "usuarioId" integer NOT NULL, "tokenHash" varchar NOT NULL, "expiraEm" varchar NOT NULL, "usadoEm" varchar, "criadoEm" varchar NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "UQ_recuperacoes_tokenHash" UNIQUE ("tokenHash"), CONSTRAINT "FK_recuperacoes_usuarios" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_recuperacoes_usuarios" ON "recuperacoes_senha" ("usuarioId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "recuperacoes_senha"`);
  }
}
