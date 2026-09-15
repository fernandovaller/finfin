import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ResumoMes from '../ResumoMes';
import { api, type Despesa, type Receita, type Resumo } from '../api';
import {
  AlertaErro,
  BRL,
  corBadge,
  formatarData,
  IconeCasa,
  mesAtual,
  MesNav,
  mesLabel,
  StatusSync,
  TituloPagina,
} from '../ui';
import { useCatalogo } from './useCatalogo';

export default function Home() {
  const [mes, setMes] = useState(mesAtual);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);
  const { corDe, contas, contaPorId } = useCatalogo();
  const [contaFiltro, setContaFiltro] = useState<number | ''>('');

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    const qs = contaFiltro === '' ? '' : `&contaId=${contaFiltro}`;
    Promise.all([
      api<Receita[]>('/api/receitas'),
      api<Despesa[]>('/api/despesas'),
      api<Resumo>(`/api/resumo?mes=${mes}${qs}`),
    ])
      .then(([r, d, s]) => {
        if (!ativo) return;
        setReceitas(r);
        setDespesas(d);
        setResumo(s);
        setErro('');
        setSincronizadoEm(new Date());
      })
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : 'Falha ao carregar dados'))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, [mes, contaFiltro]);

  const recentes = useMemo(() => {
    const f = (id: number | null) => contaFiltro === '' || id === contaFiltro;
    const rs = receitas
      .filter((r) => r.data.startsWith(mes) && f(r.contaId))
      .map((r) => ({ id: `r-${r.id}`, data: r.data, titulo: r.origem, detalhe: r.categoria, conta: contaPorId(r.contaId), valor: r.valor, tipo: 'receita' as const }));
    const ds = despesas
      .filter((d) => d.data.startsWith(mes) && f(d.contaId))
      .map((d) => ({ id: `d-${d.id}`, data: d.data, titulo: d.descricao || d.categoria, detalhe: d.categoria, conta: contaPorId(d.contaId), valor: d.valor, tipo: 'despesa' as const }));
    return [...rs, ...ds].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8);
  }, [receitas, despesas, mes, contaFiltro, contaPorId]);

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TituloPagina Icon={IconeCasa}>Home</TituloPagina>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={contaFiltro}
            onChange={(e) => setContaFiltro(e.target.value === '' ? '' : Number(e.target.value))}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm outline-none"
            aria-label="Filtrar por conta"
          >
            <option value="">Todas as contas</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icone ? `${c.icone} ` : ''}{c.nome}
              </option>
            ))}
          </select>
          <MesNav mes={mes} onChange={setMes} />
        </div>
      </div>

      <AlertaErro mensagem={erro} />

      <ResumoMes
        resumo={resumo}
        carregando={carregando}
        mes={mes}
        qtdReceitas={receitas.filter((r) => r.data.startsWith(mes) && (contaFiltro === '' || r.contaId === contaFiltro)).length}
        qtdDespesas={despesas.filter((d) => d.data.startsWith(mes) && (contaFiltro === '' || d.contaId === contaFiltro)).length}
      />

      <section
        aria-label="Atividade recente"
        className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">
            Atividade recente <span className="ml-1 text-sm font-medium text-slate-400 dark:text-slate-500">· {mesLabel(mes)}</span>
          </h2>
          <Link
            to="/lancamentos"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700"
          >
            + Novo lançamento
          </Link>
        </div>
        {carregando ? (
          <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">Carregando…</p>
        ) : recentes.length === 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
            Nenhum movimento neste mês.{' '}
            <Link to="/lancamentos" className="font-semibold text-emerald-700 dark:text-emerald-300 hover:underline">
              Adicionar o primeiro
            </Link>
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {recentes.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-2.5">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    item.tipo === 'receita'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {item.tipo === 'receita' ? '+' : '−'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.titulo}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    {formatarData(item.data)}
                    {item.conta && <span>· {item.conta}</span>}
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${item.tipo === 'receita' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 ring-emerald-200 dark:ring-emerald-900' : corBadge(corDe(item.detalhe, 'despesa'))}`}
                    >
                      {item.detalhe}
                    </span>
                  </p>
                </div>
                <p
                  className={`text-sm font-bold tabular-nums ${item.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}
                >
                  {BRL.format(item.valor)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StatusSync carregando={carregando} erro={erro} sincronizadoEm={sincronizadoEm} />
    </main>
  );
}
