import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adiciona `resendApiKey` em `usuarios` (chave do Resend para envio de
 * e-mails, ex.: recuperação de senha). Coluna nulável: ADD COLUMN não
 * toca nos dados existentes. O guarda PRAGMA deixa a migration
 * idempotente mesmo fora do controle da tabela `migrations`.
 */
export class ResendApiKey1789558563730 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const colunas: Array<{ name: string }> = await queryRunner.query(
      `PRAGMA table_info("usuarios")`,
    );
    if (!colunas.some((c) => c.name === 'resendApiKey')) {
      await queryRunner.query(`ALTER TABLE "usuarios" ADD COLUMN "resendApiKey" text`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "usuarios" DROP COLUMN "resendApiKey"`);
  }
}
