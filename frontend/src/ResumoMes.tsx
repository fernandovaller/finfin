import { BRL, IconeSeta, mesLabel, pluralLancamentos } from './ui';
import type { Resumo } from './api';

interface Props {
  resumo: Resumo | null;
  carregando: boolean;
  mes: string;
  qtdReceitas: number;
  qtdDespesas: number;
}

export default function ResumoMes({ resumo, carregando, mes, qtdReceitas, qtdDespesas }: Props) {
  const totalReceitas = resumo?.totalReceitas ?? 0;
  const totalDespesas = resumo?.totalDespesas ?? 0;
  const saldoPositivo = (resumo?.saldo ?? 0) >= 0;

  return (
      <section aria-label="Resumo do mês" className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">Receitas · {mesLabel(mes)}</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
              <IconeSeta direcao="cima" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {carregando ? '…' : BRL.format(totalReceitas)}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{pluralLancamentos(qtdReceitas)}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">Despesas · {mesLabel(mes)}</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950">
              <IconeSeta direcao="baixo" className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
            {carregando ? '…' : BRL.format(totalDespesas)}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{pluralLancamentos(qtdDespesas)}</p>
        </div>
        <div
          className={`rounded-2xl p-5 shadow-sm ring-1 ${
            saldoPositivo
              ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white ring-emerald-600'
              : 'bg-gradient-to-br from-rose-500 to-red-700 text-white ring-rose-600'
          }`}
        >
          <p className={`text-sm font-medium ${saldoPositivo ? 'text-emerald-100' : 'text-rose-100'}`}>
            Saldo do mês
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {carregando ? '…' : BRL.format(resumo?.saldo ?? 0)}
          </p>
          <p className={`mt-1 text-xs ${saldoPositivo ? 'text-emerald-100' : 'text-rose-100'}`}>
            {saldoPositivo ? 'No azul — continue assim' : 'Atenção — despesas acima das receitas'}
          </p>
        </div>
      </section>
  );
}
