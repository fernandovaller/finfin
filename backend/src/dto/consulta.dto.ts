import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsDataValida, IsMesValido } from './data-valida';

/**
 * DTOs de query string (item 1 do SECURITY.md).
 *
 * Tudo chega como string na URL — os `@Transform` convertem antes de
 * validar (`transform: true` no pipe global). `''` vira `undefined`
 * (equivale a "não filtrar", como o frontend espera).
 */

const textoOuIndefinido = () =>
  Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    return typeof value === 'string' ? value.trim() : value;
  });

const inteiroOuIndefinido = () =>
  Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? value : n;
  });

/** ?contaId= (receitas, despesas) */
export class ContaQueryDto {
  @IsOptional()
  @inteiroOuIndefinido()
  @IsInt({ message: 'contaId inválido' })
  contaId?: number;
}

/** ?mes=YYYY-MM&contaId= (resumo) */
export class ResumoQueryDto extends ContaQueryDto {
  @IsOptional()
  @textoOuIndefinido()
  @IsString()
  @IsMesValido()
  mes?: string;
}

/** ?tipo=receitas|despesas (exportar/csv) */
export class ExportarCsvQueryDto {
  @textoOuIndefinido()
  @IsIn(['receitas', 'despesas'], { message: 'Campo "tipo" deve ser "receitas" ou "despesas"' })
  tipo!: string;
}

/** DELETE ?escopo=grupo (despesas parceladas) */
export class DeleteDespesaQueryDto {
  @IsOptional()
  @textoOuIndefinido()
  @IsIn(['grupo'], { message: 'Campo "escopo" deve ser "grupo"' })
  escopo?: string;
}

/** ?tipo=receita|despesa (categorias) */
export class CategoriasQueryDto {
  @IsOptional()
  @textoOuIndefinido()
  @IsIn(['receita', 'despesa'], { message: 'Campo "tipo" deve ser "receita" ou "despesa"' })
  tipo?: string;
}

export class AuditoriaQueryDto {
  @IsOptional()
  @textoOuIndefinido()
  @IsString()
  @MaxLength(40)
  modulo?: string;

  @IsOptional()
  @textoOuIndefinido()
  @IsString()
  @MaxLength(20)
  acao?: string;

  @IsOptional()
  @textoOuIndefinido()
  @IsString()
  @MaxLength(300)
  descricao?: string;

  @IsOptional()
  @textoOuIndefinido()
  @IsDataValida({ message: 'dataInicio deve estar no formato YYYY-MM-DD válido' })
  dataInicio?: string;

  @IsOptional()
  @textoOuIndefinido()
  @IsDataValida({ message: 'dataFim deve estar no formato YYYY-MM-DD válido' })
  dataFim?: string;

  @IsOptional()
  @inteiroOuIndefinido()
  @IsInt({ message: 'pagina inválida' })
  @Min(1, { message: 'pagina inválida' })
  pagina?: number;

  @IsOptional()
  @inteiroOuIndefinido()
  @IsInt({ message: 'porPagina inválido' })
  @Min(1, { message: 'porPagina inválido' })
  @Max(100, { message: 'porPagina inválido' })
  porPagina?: number;
}

/** DELETE /api/auditoria?antesDe=YYYY-MM-DD */
export class LimparAuditoriaQueryDto {
  @IsOptional()
  @textoOuIndefinido()
  @IsDataValida({ message: 'antesDe deve estar no formato YYYY-MM-DD válido' })
  antesDe?: string;
}
