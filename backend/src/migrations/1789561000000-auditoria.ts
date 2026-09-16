import { MigrationInterface, QueryRunner } from 'typeorm';

/** Trilha de auditoria: um registro imutável por mutação, escopado por usuário. */
export class Auditoria1789561000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "auditorias" (` +
        `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, ` +
        `"usuarioId" integer, ` +
        `"modulo" varchar NOT NULL, ` +
        `"acao" varchar NOT NULL, ` +
        `"registroId" integer, ` +
        `"descricao" varchar NOT NULL DEFAULT (''), ` +
        `"detalhes" text, ` +
        `"criadoEm" varchar NOT NULL DEFAULT (CURRENT_TIMESTAMP), ` +
        `CONSTRAINT "FK_auditorias_usuarios" FOREIGN KEY ("usuarioId") REFERENCES "usuarios" ("id")` +
        `)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_auditorias_usuarios" ON "auditorias" ("usuarioId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_auditorias_data" ON "auditorias" ("criadoEm")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "auditorias"`);
  }
}
