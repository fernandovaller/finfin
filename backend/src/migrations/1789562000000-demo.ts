import { MigrationInterface, QueryRunner } from 'typeorm';

/** Coluna `demo`: marca contas/lançamentos da demonstração para remoção seletiva. */
export class Demo1789562000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const tabela of ['receitas', 'despesas', 'contas']) {
      const coluna = await queryRunner.query(`PRAGMA table_info("${tabela}")`);
      const nomes = new Set((coluna as Array<{ name: string }>).map((c) => c.name));
      if (!nomes.has('demo')) {
        await queryRunner.query(
          `ALTER TABLE "${tabela}" ADD COLUMN "demo" boolean NOT NULL DEFAULT (0)`,
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // SQLite não tem DROP COLUMN em versões antigas — recriação fora do escopo;
    // a coluna `demo` é inofensiva se permanecer.
  }
}
