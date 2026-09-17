import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/**
 * DTOs do auth.
 *
 * Convenções (valem para todos os DTOs do projeto):
 * - `@Transform` normaliza (trim/lower) antes de validar;
 * - campo extra cai no `forbidNonWhitelisted` do pipe global;
 * - negócio (conflito, ownership, existência) continua no service.
 */

const emailNormalizado = () =>
  Transform(({ value }) => String(value ?? '').trim().toLowerCase());

const textoLimpo = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class LoginDto {
  @emailNormalizado()
  @IsEmail({}, { message: 'Campo "email" inválido' })
  email!: string;

  // Mínimo 1 (não 8): senha curta/wrong cai no 401 genérico do service.
  @IsString({ message: 'Informe e-mail e senha' })
  @Length(1, 128, { message: 'Informe e-mail e senha' })
  senha!: string;
}

export class CadastroDto {
  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Campo "nome" deve ter de 1 a 120 caracteres' })
  nome!: string;

  @emailNormalizado()
  @IsEmail({}, { message: 'Campo "email" inválido' })
  email!: string;

  @IsString()
  @Length(8, 128, { message: 'Campo "senha" deve ter de 8 a 128 caracteres' })
  senha!: string;
}

export class AtualizarPerfilDto {
  @IsOptional()
  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Campo "nome" deve ter de 1 a 120 caracteres' })
  nome?: string;

  @IsOptional()
  @emailNormalizado()
  @IsEmail({}, { message: 'Campo "email" inválido' })
  email?: string;

  // null = remover; string = dataURL de imagem (mesma regra do service).
  @IsOptional()
  @IsString({ message: 'Campo "avatar" deve ser uma imagem (dataURL)' })
  @Matches(/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/, {
    message: 'Campo "avatar" deve ser uma imagem (dataURL)',
  })
  @MaxLength(500_000, { message: 'Avatar grande demais (máximo ~375 KB)' })
  avatar?: string | null;
}

export class TrocarSenhaDto {
  @IsString()
  @Length(1, 128)
  senhaAtual!: string;

  @IsString()
  @Length(8, 128, { message: 'A nova senha deve ter de 8 a 128 caracteres' })
  novaSenha!: string;
}

export class SalvarIntegracoesDto {
  // null/'' = limpar (vale a chave do servidor); senão 10–500 chars.
  @ValidateIf((o) => o.resendApiKey !== null && o.resendApiKey !== '' && o.resendApiKey !== undefined)
  @textoLimpo()
  @IsString({ message: 'Chave do Resend inválida' })
  @Length(10, 500, { message: 'Chave do Resend inválida' })
  resendApiKey?: string | null;
}

export class RecuperarSenhaDto {
  @emailNormalizado()
  @IsEmail({}, { message: 'Campo "email" inválido' })
  email!: string;
}

export class RedefinirSenhaDto {
  @IsString()
  @Length(1, 200, { message: 'Token inválido ou expirado' })
  token!: string;

  @IsString()
  @Length(8, 128, { message: 'A nova senha deve ter de 8 a 128 caracteres' })
  novaSenha!: string;
}
