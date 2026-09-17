import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CORES_CATEGORIA } from '../categoria.entity';

/**
 * DTOs do catálogo.
 *
 * Update é parcial (`@IsOptional` em tudo): o frontend manda só o que
 * mudou — menos `tipo` em categoria, que o service ignora (não atualiza).
 */

const textoLimpo = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export class CreateCategoriaDto {
  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Campo "nome" deve ter de 1 a 120 caracteres' })
  nome!: string;

  @IsIn(['receita', 'despesa'], { message: 'Campo "tipo" deve ser "receita" ou "despesa"' })
  tipo!: string;

  @IsOptional()
  @IsString()
  @IsIn([...CORES_CATEGORIA], { message: 'Campo "cor" inválido' })
  cor?: string;
}

export class UpdateCategoriaDto {
  @IsOptional()
  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Campo "nome" deve ter de 1 a 120 caracteres' })
  nome?: string;

  @IsOptional()
  @IsString()
  @IsIn([...CORES_CATEGORIA], { message: 'Campo "cor" inválido' })
  cor?: string;
}

export class CreateFormaDto {
  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Campo "nome" deve ter de 1 a 120 caracteres' })
  nome!: string;
}

export class UpdateFormaDto {
  @IsOptional()
  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Campo "nome" deve ter de 1 a 120 caracteres' })
  nome?: string;
}

const SALDO_MAXIMO = 1_000_000_000_000;

export class CreateContaDto {
  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Campo "nome" deve ter de 1 a 120 caracteres' })
  nome!: string;

  @IsOptional()
  @IsNumber({}, { message: 'Campo "saldoInicial" deve ser um número' })
  @Min(-SALDO_MAXIMO, { message: 'Campo "saldoInicial" grande demais' })
  @Max(SALDO_MAXIMO, { message: 'Campo "saldoInicial" grande demais' })
  saldoInicial?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  nota?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  icone?: string;

  @IsOptional()
  @IsBoolean()
  principal?: boolean;
}

export class UpdateContaDto {
  @IsOptional()
  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Campo "nome" deve ter de 1 a 120 caracteres' })
  nome?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Campo "saldoInicial" deve ser um número' })
  @Min(-SALDO_MAXIMO, { message: 'Campo "saldoInicial" grande demais' })
  @Max(SALDO_MAXIMO, { message: 'Campo "saldoInicial" grande demais' })
  saldoInicial?: number;

  @IsOptional()
  @IsString({ message: 'Campo "nota" inválido' })
  @MaxLength(2000)
  nota?: string;

  @IsOptional()
  @IsString({ message: 'Campo "icone" inválido' })
  @MaxLength(20)
  icone?: string;

  @IsOptional()
  @IsBoolean()
  principal?: boolean;
}
