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
  const total = totalReceitas + totalDespesas;
  const pctDespesas = total > 0 ? Math.round((totalDespesas / total) * 100) : 0;
  const saldoPositivo = (resumo?.saldo ?? 0) >= 0;

  return (
    <>
      <section aria-label="Resumo do mês" className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Receitas · {mesLabel(mes)}</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
              <IconeSeta direcao="cima" className="h-4 w-4 text-emerald-600" />
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
            {carregando ? '…' : BRL.format(totalReceitas)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{pluralLancamentos(qtdReceitas)}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Despesas · {mesLabel(mes)}</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100">
              <IconeSeta direcao="baixo" className="h-4 w-4 text-rose-600" />
            </span>
          </div>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-600">
            {carregando ? '…' : BRL.format(totalDespesas)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{pluralLancamentos(qtdDespesas)}</p>
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

      <div
        aria-label="Proporção entre despesas e receitas"
        className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200"
      >
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="bg-emerald-500 transition-all" style={{ width: `${100 - pctDespesas}%` }} />
          <div className="bg-rose-500 transition-all" style={{ width: `${pctDespesas}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs font-medium text-slate-500">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Receitas {100 - pctDespesas}%
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
            Despesas {pctDespesas}%
          </span>
        </div>
      </div>
    </>
  );
}
