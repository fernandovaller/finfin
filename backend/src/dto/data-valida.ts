import {
  Matches,
  Validate,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Data calendário real no formato YYYY-MM-DD.
 * `IsDateString` aceita `2026-02-30` — este não. Mesma regra do
 * `assertData` do service (que continua como defesa em profundidade).
 */
@ValidatorConstraint({ name: 'dataValida', async: false })
class DataValidaConstraint implements ValidatorConstraintInterface {
  validate(valor: unknown): boolean {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const [a, m, d] = valor.split('-').map(Number);
    const dt = new Date(Date.UTC(a, m - 1, d));
    return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  defaultMessage(): string {
    return 'data deve estar no formato YYYY-MM-DD válido';
  }
}

export function IsDataValida(opcoes?: ValidationOptions) {
  return Validate(DataValidaConstraint, opcoes);
}

/** Mes de competência YYYY-MM (01–12). */
export function IsMesValido(opcoes?: ValidationOptions) {
  return Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'mes deve estar no formato YYYY-MM', ...opcoes });
}
