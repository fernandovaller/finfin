import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ResumoMes from '../ResumoMes';
import { GraficoBarrasMensal, GraficoDonut } from '../Graficos';
import { api, type Despesa, type Receita, type Resumo } from '../api';
import {
  AlertaErro,
  BRL,
  corBadge,
  deslocarMes,
  formatarData,
  IconeCarteira,
  IconeCasa,
  mesAtual,
  MesNav,
  mesLabel,
  StatusSync,
  TituloPagina,
} from '../ui';
import { useCatalogo } from './useCatalogo';

function rotuloCurto(mes: string): string {
  const [ano, m] = mes.split('-').map(Number);
  const nome = new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${nome}/${String(ano).slice(2)}`;
}

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

  const noMes = (data: string) => data.startsWith(mes);
  const noFiltro = (id: number | null) => contaFiltro === '' || id === contaFiltro;
  const recMes = useMemo(() => receitas.filter((r) => noMes(r.data) && noFiltro(r.contaId)), [receitas, mes, contaFiltro]);
  const desMes = useMemo(() => despesas.filter((d) => noMes(d.data) && noFiltro(d.contaId)), [despesas, mes, contaFiltro]);

  const recentes = useMemo(() => {
    const rs = recMes.map((r) => ({ id: `r-${r.id}`, data: r.data, titulo: r.origem, detalhe: r.categoria, conta: contaPorId(r.contaId), valor: r.valor, tipo: 'receita' as const, cor: corDe(r.categoria, 'receita') }));
    const ds = desMes.map((d) => ({ id: `d-${d.id}`, data: d.data, titulo: d.descricao || d.categoria, detalhe: d.categoria, conta: contaPorId(d.contaId), valor: d.valor, tipo: 'despesa' as const, cor: corDe(d.categoria, 'despesa') }));
    return [...rs, ...ds].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 8);
  }, [recMes, desMes, contaPorId, corDe]);

  const evolucao = useMemo(() => {
    const lista: string[] = [];
    for (let i = 5; i >= 0; i--) lista.push(deslocarMes(mes, -i));
    return lista.map((m) => ({
      mes: m,
      rotulo: rotuloCurto(m),
      receitas: receitas.filter((r) => r.data.startsWith(m) && noFiltro(r.contaId)).reduce((s, r) => s + r.valor, 0),
      despesas: despesas.filter((d) => d.data.startsWith(m) && noFiltro(d.contaId)).reduce((s, d) => s + d.valor, 0),
    }));
  }, [receitas, despesas, mes, contaFiltro]);

  const fatias = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const d of desMes) mapa.set(d.categoria, (mapa.get(d.categoria) ?? 0) + d.valor);
    return [...mapa.entries()]
      .map(([nome, total]) => ({ nome, total, cor: corDe(nome, 'despesa') }))
      .sort((a, b) => b.total - a.total);
  }, [desMes, corDe]);

  const saldosContas = useMemo(() => {
    const visiveis = (contaFiltro === '' ? contas : contas.filter((c) => c.id === contaFiltro)).slice().sort((a, b) => {
      if (a.principal !== b.principal) return a.principal ? -1 : 1;
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
    return visiveis.map((c) => {
      const recTotal = receitas.filter((r) => r.contaId === c.id).reduce((s, r) => s + r.valor, 0);
      const desTotal = despesas.filter((d) => d.contaId === c.id).reduce((s, d) => s + d.valor, 0);
      const recM = recMes.filter((r) => r.contaId === c.id).reduce((s, r) => s + r.valor, 0);
      const desM = desMes.filter((d) => d.contaId === c.id).reduce((s, d) => s + d.valor, 0);
      return { conta: c, saldoAtual: c.saldoInicial + recTotal - desTotal, movimento: recM - desM, recM, desM };
    });
  }, [contas, contaFiltro, receitas, despesas, recMes, desMes]);

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
        qtdReceitas={recMes.length}
        qtdDespesas={desMes.length}
      />

      <section
        aria-label="Contas"
        className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <IconeCarteira className="h-5 w-5 text-slate-400" />
            Contas
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500">· {mesLabel(mes)}</span>
          </h2>
          <Link to="/contas" className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:underline">
            Gerenciar
          </Link>
        </div>
        {carregando ? (
          <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">Carregando…</p>
        ) : saldosContas.length === 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
            Nenhuma conta cadastrada.{' '}
            <Link to="/contas" className="font-semibold text-emerald-700 dark:text-emerald-300 hover:underline">
              Criar a primeira
            </Link>
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {saldosContas.map(({ conta, saldoAtual, movimento, recM, desM }) => (
              <li
                key={conta.id}
                className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 ring-1 ring-inset ring-slate-100 dark:ring-slate-800"
              >
                <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                  {conta.icone && <span aria-hidden>{conta.icone}</span>}
                  <span className="truncate">{conta.nome}</span>
                  {conta.principal && (
                    <span className="shrink-0 rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      Principal
                    </span>
                  )}
                </p>
                <p className={`mt-1 text-xl font-bold tabular-nums ${saldoAtual >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-rose-600 dark:text-rose-400'}`}>
                  {BRL.format(saldoAtual)}
                </p>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">saldo atual</p>
                <div className="mt-2 flex items-center justify-between border-t border-slate-200/70 dark:border-slate-700/60 pt-2 text-xs">
                  <span className="font-medium text-slate-400 dark:text-slate-500">
                    +{BRL.format(recM)} · −{BRL.format(desM)}
                  </span>
                  <span className={`font-bold tabular-nums ${movimento >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {movimento >= 0 ? '+' : ''}{BRL.format(movimento)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <section
          aria-label="Evolução dos últimos 6 meses"
          className="flex h-full flex-col rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
        >
          <h2 className="text-base font-bold">Receitas x Despesas</h2>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Últimos 6 meses</p>
          <div className="mt-3 flex-1">
            {carregando ? (
              <p className="flex h-[240px] items-center text-sm text-slate-400 dark:text-slate-500">Carregando…</p>
            ) : (
              <>
                <GraficoBarrasMensal dados={evolucao} />
                <div className="mt-1 flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    Receitas
                  </span>
                  <span>
                    <span className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />
                    Despesas
                  </span>
                </div>
              </>
            )}
          </div>
        </section>

        <section
          aria-label="Despesas por categoria"
          className="flex h-full flex-col rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
        >
          <h2 className="text-base font-bold">
            Despesas por categoria <span className="ml-1 text-sm font-medium text-slate-400 dark:text-slate-500">· {mesLabel(mes)}</span>
          </h2>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Por categoria no mês</p>
          <div className="mt-3 flex-1">
            {carregando ? (
              <p className="flex h-[240px] items-center text-sm text-slate-400 dark:text-slate-500">Carregando…</p>
            ) : (
              <GraficoDonut fatias={fatias} />
            )}
          </div>
        </section>
      </div>

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
                      className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${item.tipo === 'receita' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 ring-emerald-200 dark:ring-emerald-900' : corBadge(item.cor)}`}
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
