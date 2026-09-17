import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length } from 'class-validator';

/**
 * Exemplo-base da migração para DTOs (item 1 do SECURITY.md).
 *
 * Padrão para os próximos DTOs:
 * - um campo por propriedade esperada, com decoradores de tipo/tamanho;
 * - `@Transform` para normalizar (trim/lower) antes de validar;
 * - nada de `any`: campo extra cai no `forbidNonWhitelisted` do pipe global.
 * Validação de negócio (ex.: conta existe, é do dono) continua no service.
 */
export class LoginDto {
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail({}, { message: 'Campo "email" inválido' })
  email!: string;

  @IsString({ message: 'Informe e-mail e senha' })
  @Length(1, 128, { message: 'Informe e-mail e senha' })
  senha!: string;
}
