import { useEffect, useMemo, useState } from 'react';
import LancamentoForm, { type LancamentoValues, type TipoLancamento } from '../LancamentoForm';
import { api, type Despesa, type Receita } from '../api';
import {
  AlertaErro,
  BRL,
  ConfirmarExclusao,
  corBadge,
  formatarData,
  IconeLapiz,
  IconeLixeira,
  mesAtual,
  MesNav,
  mesLabel,
  Modal,
  StatusSync,
} from '../ui';
import { useCatalogo } from './useCatalogo';

type Edicao = { kind: 'receita'; item: Receita } | { kind: 'despesa'; item: Despesa } | null;

export default function Lancamentos() {
  const [mes, setMes] = useState(mesAtual);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);

  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [formKey, setFormKey] = useState(0);
  const [edicao, setEdicao] = useState<Edicao>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<{ path: string; descricao: string } | null>(null);

  const { nomesPorTipo, formas, corDe } = useCatalogo();

  async function recarregar(mesRef: string) {
    try {
      setErro('');
      const [r, d] = await Promise.all([
        api<Receita[]>('/api/receitas'),
        api<Despesa[]>('/api/despesas'),
      ]);
      setReceitas(r);
      setDespesas(d);
      setSincronizadoEm(new Date());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar dados');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    setCarregando(true);
    void recarregar(mes);
  }, [mes]);

  const receitasDoMes = useMemo(
    () => receitas.filter((r) => r.data.startsWith(mes)).sort((a, b) => b.data.localeCompare(a.data)),
    [receitas, mes],
  );
  const despesasDoMes = useMemo(
    () => despesas.filter((d) => d.data.startsWith(mes)).sort((a, b) => b.data.localeCompare(a.data)),
    [despesas, mes],
  );

  async function criar(v: LancamentoValues) {
    setSalvando(true);
    try {
      setErro('');
      const path = tipo === 'receita' ? '/api/receitas' : '/api/despesas';
      await api(path, {
        method: 'POST',
        body: JSON.stringify({
          ...v,
          ...(tipo === 'receita' ? { origem: v.origem } : { descricao: v.origem }),
        }),
      });
      setFormKey((k) => k + 1);
      await recarregar(mes);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao(v: LancamentoValues) {
    if (!edicao) return;
    setSalvando(true);
    try {
      setErro('');
      await api(`/api/${edicao.kind}s/${edicao.item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...v,
          ...(edicao.kind === 'receita' ? { origem: v.origem } : { descricao: v.origem }),
        }),
      });
      setEdicao(null);
      await recarregar(mes);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(path: string) {
    try {
      setErro('');
      await api(path, { method: 'DELETE' });
      setConfirmarExclusao(null);
      await recarregar(mes);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao excluir');
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Lançamentos</h1>
        <MesNav mes={mes} onChange={setMes} />
      </div>

      <AlertaErro mensagem={erro} />

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <section
          aria-label="Novo lançamento"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:col-span-2"
        >
          <h2 className="text-base font-bold">Novo lançamento</h2>
          <div className="mt-3">
            <LancamentoForm
              key={formKey}
              tipo={tipo}
              onTipoChange={setTipo}
              categoriasReceita={nomesPorTipo('receita')}
              categoriasDespesa={nomesPorTipo('despesa')}
              formas={formas}
              submitLabel={`Adicionar ${tipo}`}
              submitting={salvando}
              onSubmit={criar}
              onErro={setErro}
            />
          </div>
        </section>

        <div className="space-y-6 lg:col-span-3">
          <section
            aria-label="Receitas do mês"
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <h2 className="text-base font-bold">
              Receitas <span className="ml-1 text-sm font-medium text-slate-400">· {mesLabel(mes)}</span>
            </h2>
            {carregando ? (
              <p className="mt-3 text-sm text-slate-400">Carregando…</p>
            ) : receitasDoMes.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                Nenhuma receita neste mês.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {receitasDoMes.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      +
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.origem}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                        {formatarData(r.data)}
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${corBadge(corDe(r.categoria, 'receita'))}`}
                        >
                          {r.categoria}
                        </span>
                        {r.formaPagamento && <span>· {r.formaPagamento}</span>}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-emerald-600">
                      {BRL.format(r.valor)}
                    </p>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setEdicao({ kind: 'receita', item: r })}
                        aria-label={`Editar receita ${r.origem}`}
                        title="Editar"
                        className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <IconeLapiz className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmarExclusao({ path: `/api/receitas/${r.id}`, descricao: r.origem })
                        }
                        aria-label={`Excluir receita ${r.origem}`}
                        title="Excluir"
                        className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <IconeLixeira className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-label="Despesas do mês"
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
          >
            <h2 className="text-base font-bold">
              Despesas <span className="ml-1 text-sm font-medium text-slate-400">· {mesLabel(mes)}</span>
            </h2>
            {carregando ? (
              <p className="mt-3 text-sm text-slate-400">Carregando…</p>
            ) : despesasDoMes.length === 0 ? (
              <p className="mt-3 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                Nenhuma despesa neste mês.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {despesasDoMes.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-700">
                      −
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{d.descricao || d.categoria}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                        {formatarData(d.data)}
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${corBadge(corDe(d.categoria, 'despesa'))}`}
                        >
                          {d.categoria}
                        </span>
                        {d.formaPagamento && <span>· {d.formaPagamento}</span>}
                      </p>
                    </div>
                    <p className="text-sm font-bold tabular-nums text-slate-800">
                      {BRL.format(d.valor)}
                    </p>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => setEdicao({ kind: 'despesa', item: d })}
                        aria-label={`Editar despesa ${d.descricao || d.categoria}`}
                        title="Editar"
                        className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
                      >
                        <IconeLapiz className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmarExclusao({
                            path: `/api/despesas/${d.id}`,
                            descricao: d.descricao || d.categoria,
                          })
                        }
                        aria-label={`Excluir despesa ${d.descricao || d.categoria}`}
                        title="Excluir"
                        className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <IconeLixeira className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <StatusSync carregando={carregando} erro={erro} sincronizadoEm={sincronizadoEm} />

      {edicao && (
        <Modal titulo={`Editar ${edicao.kind}`} onFechar={() => setEdicao(null)} wide>
          <LancamentoForm
            tipo={edicao.kind}
            categoriasReceita={nomesPorTipo('receita')}
            categoriasDespesa={nomesPorTipo('despesa')}
            formas={formas}
            initial={
              edicao.kind === 'receita'
                ? {
                    data: edicao.item.data,
                    valor: edicao.item.valor,
                    categoria: edicao.item.categoria,
                    origem: edicao.item.origem,
                    formaPagamento: edicao.item.formaPagamento,
                  }
                : {
                    data: edicao.item.data,
                    valor: edicao.item.valor,
                    categoria: edicao.item.categoria,
                    origem: edicao.item.descricao,
                    formaPagamento: edicao.item.formaPagamento,
                  }
            }
            submitLabel="Salvar alterações"
            submitting={salvando}
            onSubmit={salvarEdicao}
            onErro={setErro}
          />
          <button
            type="button"
            onClick={() => setEdicao(null)}
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
        </Modal>
      )}

      {confirmarExclusao && (
        <ConfirmarExclusao
          descricao={confirmarExclusao.descricao}
          onCancelar={() => setConfirmarExclusao(null)}
          onConfirmar={() => excluir(confirmarExclusao.path)}
        />
      )}
    </main>
  );
}
