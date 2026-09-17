import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Suporte a refresh em cookie HttpOnly: `sessoes` ganha `tipo`
 * (access = Bearer de 15 min | refresh = cookie de 7 dias) e
 * `refreshToken` (access aponta para o refresh que o gerou).
 * Colunas nuláveis: linhas antigas (era do localStorage) ficam com
 * tipo NULL e seguem válidas como access até expirarem.
 */
export class SessaoRefresh1789563000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const colunas: Array<{ name: string }> = await queryRunner.query(
      `PRAGMA table_info("sessoes")`,
    );
    if (!colunas.some((c) => c.name === 'tipo')) {
      await queryRunner.query(`ALTER TABLE "sessoes" ADD COLUMN "tipo" text`);
    }
    if (!colunas.some((c) => c.name === 'refreshToken')) {
      await queryRunner.query(`ALTER TABLE "sessoes" ADD COLUMN "refreshToken" text`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessoes" DROP COLUMN "refreshToken"`);
    await queryRunner.query(`ALTER TABLE "sessoes" DROP COLUMN "tipo"`);
  }
}
