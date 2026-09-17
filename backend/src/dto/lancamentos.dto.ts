import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CORES_CATEGORIA } from '../categoria.entity';
import { IsDataValida } from './data-valida';

/**
 * DTOs de lançamentos, OFX e backup (item 1 do SECURITY.md).
 *
 * Campos `origem` (em despesa) e `parcelas` (em receita) existem só por
 * compatibilidade: o `LancamentoForm` espalha `...v` e os envia junto.
 * O service os ignora — o DTO apenas tolera em vez de 400.
 */

const VALOR_MAXIMO = 1_000_000_000_000;

const textoLimpo = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

class LancamentoBaseDto {
  @IsDataValida()
  data!: string;

  @IsNumber({}, { message: 'Campo "valor" deve ser um número maior que zero' })
  @IsPositive({ message: 'Campo "valor" deve ser um número maior que zero' })
  @Max(VALOR_MAXIMO, { message: 'Campo "valor" grande demais' })
  valor!: number;

  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Campo "categoria" deve ter de 1 a 120 caracteres' })
  categoria!: string;

  @IsOptional()
  @textoLimpo()
  @IsString()
  @MaxLength(80)
  formaPagamento?: string;

  @IsInt({ message: 'Campo obrigatório: contaId' })
  contaId!: number;

  @IsOptional()
  @textoLimpo()
  @IsString()
  @MaxLength(2000)
  nota?: string;
}

export class CreateReceitaDto extends LancamentoBaseDto {
  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Campo "origem" deve ter de 1 a 120 caracteres' })
  origem!: string;

  /** Compat: form envia `parcelas: 1` junto; receita ignora. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(21)
  parcelas?: number;
}

export class CreateDespesaDto extends LancamentoBaseDto {
  @IsOptional()
  @textoLimpo()
  @IsString()
  @MaxLength(120)
  descricao?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Campo "parcelas" deve ser inteiro de 1 a 21' })
  @Max(21, { message: 'Campo "parcelas" deve ser inteiro de 1 a 21' })
  parcelas?: number;

  /** Compat: form envia `origem` junto; despesa usa `descricao`. */
  @IsOptional()
  @textoLimpo()
  @IsString()
  @MaxLength(120)
  origem?: string;
}

/** PUT exige o objeto completo (igual ao POST) — o form sempre manda tudo. */
export class UpdateReceitaDto extends CreateReceitaDto {}
export class UpdateDespesaDto extends CreateDespesaDto {}

export class OfxItemDto {
  @IsOptional()
  @textoLimpo()
  @IsString()
  @MaxLength(100)
  fitid?: string;

  @IsDataValida()
  data!: string;

  @IsNumber()
  @IsPositive()
  valor!: number;

  @IsIn(['receita', 'despesa'], { message: 'Lançamento com tipo inválido' })
  tipo!: string;

  @IsOptional()
  @textoLimpo()
  @IsString()
  @MaxLength(120)
  categoria?: string;

  @IsOptional()
  @textoLimpo()
  @IsString()
  @MaxLength(200)
  descricao?: string;
}

export class ImportarOfxDto {
  @IsInt()
  contaId!: number;

  @textoLimpo()
  @IsString()
  @Length(1, 120)
  categoriaReceita!: string;

  @textoLimpo()
  @IsString()
  @Length(1, 120)
  categoriaDespesa!: string;

  @IsOptional()
  @textoLimpo()
  @IsString()
  @MaxLength(80)
  formaPagamento?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Nenhum lançamento para importar' })
  @ArrayMaxSize(2000, { message: 'Limite de 2000 lançamentos por importação' })
  @ValidateNested({ each: true })
  @Type(() => OfxItemDto)
  itens!: OfxItemDto[];
}

/**
 * Itens do backup (POST /api/importar). Mesmos tetos das rotas de criação,
 * mais os campos que o GET /api/exportar emite (id/usuarioId/demo/fitid…):
 * o backup gerado pelo próprio export precisa passar no pipe
 * (`whitelist` + `forbidNonWhitelisted` derrubam chave não declarada).
 * Campos de identidade/posse são tolerados e ignorados pelo service —
 * só `contas[].id` é lido, para remapear `contaId` dos lançamentos.
 */
const SALDO_MAXIMO = 1_000_000_000_000;

export class BackupCategoriaDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Categoria inválida no backup (sem nome)' })
  nome!: string;

  @IsIn(['receita', 'despesa'], { message: 'Categoria inválida no backup (tipo)' })
  tipo!: string;

  @IsOptional()
  @IsString()
  @IsIn([...CORES_CATEGORIA], { message: 'Categoria inválida no backup (cor)' })
  cor?: string;

  @IsOptional()
  usuarioId?: unknown;

  @IsOptional()
  demo?: unknown;
}

export class BackupFormaPagamentoDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Forma de pagamento inválida no backup (sem nome)' })
  nome!: string;

  @IsOptional()
  usuarioId?: unknown;

  @IsOptional()
  demo?: unknown;
}

export class BackupContaDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Conta inválida no backup (sem nome)' })
  nome!: string;

  @IsOptional()
  @IsNumber({}, { message: 'Conta inválida no backup (saldoInicial)' })
  @Min(-SALDO_MAXIMO, { message: 'Conta inválida no backup (saldoInicial)' })
  @Max(SALDO_MAXIMO, { message: 'Conta inválida no backup (saldoInicial)' })
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

  @IsOptional()
  usuarioId?: unknown;

  @IsOptional()
  demo?: unknown;
}

class BackupLancamentoBaseDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsDataValida()
  data!: string;

  @IsNumber({}, { message: 'Lançamento inválido no backup (valor)' })
  @IsPositive({ message: 'Lançamento inválido no backup (valor)' })
  @Max(VALOR_MAXIMO, { message: 'Lançamento inválido no backup (valor)' })
  valor!: number;

  @textoLimpo()
  @IsString()
  @Length(1, 120)
  categoria!: string;

  @IsOptional()
  @textoLimpo()
  @IsString()
  @MaxLength(80)
  formaPagamento?: string;

  /** Id da conta no arquivo (remapeado pelo service para o id real). */
  @IsInt({ message: 'Lançamento referencia conta inexistente no backup' })
  contaId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  nota?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fitid?: string | null;

  @IsOptional()
  usuarioId?: unknown;

  @IsOptional()
  demo?: unknown;
}

export class BackupReceitaDto extends BackupLancamentoBaseDto {
  @textoLimpo()
  @IsString()
  @Length(1, 120, { message: 'Receita inválida no backup (sem origem)' })
  origem!: string;
}

export class BackupDespesaDto extends BackupLancamentoBaseDto {
  @IsOptional()
  @textoLimpo()
  @IsString()
  @MaxLength(120)
  descricao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  grupoParcela?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(21)
  parcelaAtual?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(21)
  parcelaTotal?: number | null;
}

export class BackupConteudoDto {
  @IsOptional()
  @IsString()
  app?: string;

  // Campos do export (`versao`, `exportadoEm`): tolerados, service ignora.
  // (só o `@IsOptional()` já coloca a chave na whitelist do pipe)
  @IsOptional()
  versao?: unknown;

  @IsOptional()
  exportadoEm?: unknown;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => BackupContaDto)
  contas?: BackupContaDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => BackupReceitaDto)
  receitas?: BackupReceitaDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => BackupDespesaDto)
  despesas?: BackupDespesaDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => BackupCategoriaDto)
  categorias?: BackupCategoriaDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => BackupFormaPagamentoDto)
  formasPagamento?: BackupFormaPagamentoDto[];
}

export class ImportarBackupDto {
  @IsOptional()
  @IsIn(['mesclar', 'substituir'], { message: 'Campo "modo" deve ser "mesclar" ou "substituir"' })
  modo?: string;

  @IsDefined({ message: 'Campo "backup" inválido — envie o JSON gerado pela exportação' })
  @IsObject({ message: 'Campo "backup" inválido — envie o JSON gerado pela exportação' })
  @ValidateNested()
  @Type(() => BackupConteudoDto)
  backup!: BackupConteudoDto;
}
