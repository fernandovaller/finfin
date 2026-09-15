import { useEffect, useMemo, useState } from 'react';
import { api, type Despesa, type Receita } from '../api';
import {
  AlertaErro,
  BRL,
  corBadge,
  deslocarMes,
  mesAtual,
  MesNav,
  mesLabel,
  StatusSync,
} from '../ui';
import { useCatalogo } from './useCatalogo';

function barra(pct: number, classe: string) {
  return (
    <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${classe}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export default function Relatorios() {
  const [mes, setMes] = useState(mesAtual);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);
  const { corDe } = useCatalogo();

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    Promise.all([api<Receita[]>('/api/receitas'), api<Despesa[]>('/api/despesas')])
      .then(([r, d]) => {
        if (!ativo) return;
        setReceitas(r);
        setDespesas(d);
        setErro('');
        setSincronizadoEm(new Date());
      })
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : 'Falha ao carregar dados'))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  const recMes = useMemo(() => receitas.filter((r) => r.data.startsWith(mes)), [receitas, mes]);
  const desMes = useMemo(() => despesas.filter((d) => d.data.startsWith(mes)), [despesas, mes]);
  const totalRec = recMes.reduce((s, r) => s + r.valor, 0);
  const totalDes = desMes.reduce((s, d) => s + d.valor, 0);

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const d of desMes) mapa.set(d.categoria, (mapa.get(d.categoria) ?? 0) + d.valor);
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [desMes]);

  const porForma = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number }>();
    for (const d of desMes) {
      const nome = d.formaPagamento || 'Não informada';
      const atual = mapa.get(nome) ?? { total: 0, qtd: 0 };
      mapa.set(nome, { total: atual.total + d.valor, qtd: atual.qtd + 1 });
    }
    return [...mapa.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [desMes]);

  const ultimosMeses = useMemo(() => {
    const meses: string[] = [];
    for (let i = 5; i >= 0; i--) meses.push(deslocarMes(mes, -i));
    return meses.map((m) => ({
      mes: m,
      rec: receitas.filter((r) => r.data.startsWith(m)).reduce((s, r) => s + r.valor, 0),
      des: despesas.filter((d) => d.data.startsWith(m)).reduce((s, d) => s + d.valor, 0),
    }));
  }, [receitas, despesas, mes]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Relatórios</h1>
        <MesNav mes={mes} onChange={setMes} />
      </div>

      <AlertaErro mensagem={erro} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Receitas · {mesLabel(mes)}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600">
            {carregando ? '…' : BRL.format(totalRec)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Despesas · {mesLabel(mes)}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-600">
            {carregando ? '…' : BRL.format(totalDes)}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">Saldo · {mesLabel(mes)}</p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums ${totalRec - totalDes >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
          >
            {carregando ? '…' : BRL.format(totalRec - totalDes)}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section
          aria-label="Despesas por categoria"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
        >
          <h2 className="text-base font-bold">Despesas por categoria</h2>
          {porCategoria.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
              Sem despesas neste mês.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {porCategoria.map(([nome, total]) => (
                <li key={nome} className="flex items-center gap-3">
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${corBadge(corDe(nome, 'despesa'))}`}
                  >
                    {nome}
                  </span>
                  <div className="flex-1">{barra(totalDes ? (total / totalDes) * 100 : 0, 'bg-rose-500')}</div>
                  <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums">
                    {BRL.format(total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-label="Despesas por forma de pagamento"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
        >
          <h2 className="text-base font-bold">Despesas por pagamento</h2>
          {porForma.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
              Sem despesas neste mês.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {porForma.map(([nome, { total, qtd }]) => (
                <li key={nome} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm font-medium">{nome}</span>
                  <div className="flex-1">{barra(totalDes ? (total / totalDes) * 100 : 0, 'bg-sky-500')}</div>
                  <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums">
                    {BRL.format(total)}
                  </span>
                  <span className="w-8 shrink-0 text-right text-xs text-slate-400">×{qtd}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section
        aria-label="Últimos 6 meses"
        className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
      >
        <h2 className="px-5 pt-5 text-base font-bold">Últimos 6 meses</h2>
        <div className="overflow-x-auto p-5 pt-3">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="pb-2 font-semibold">Mês</th>
                <th className="pb-2 text-right font-semibold">Receitas</th>
                <th className="pb-2 text-right font-semibold">Despesas</th>
                <th className="pb-2 text-right font-semibold">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ultimosMeses.map(({ mes: m, rec, des }) => (
                <tr key={m} className={m === mes ? 'bg-emerald-50/60 font-semibold' : ''}>
                  <td className="py-2 pr-4 capitalize">{mesLabel(m)}</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600">{BRL.format(rec)}</td>
                  <td className="py-2 text-right tabular-nums text-rose-600">{BRL.format(des)}</td>
                  <td
                    className={`py-2 text-right tabular-nums ${rec - des >= 0 ? 'text-slate-800' : 'font-bold text-rose-600'}`}
                  >
                    {BRL.format(rec - des)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <StatusSync carregando={carregando} erro={erro} sincronizadoEm={sincronizadoEm} />
    </main>
  );
}
