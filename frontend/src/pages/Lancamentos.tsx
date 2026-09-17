import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LancamentoForm, { type LancamentoValues, type TipoLancamento } from '../LancamentoForm';
import { api, type Despesa, type Receita } from '../api';
import {
  AlertaErro,
  BRL,
  ConfirmarExclusao,
  corBadge,
  formatarData,
  IconeExtrato,
  IconeLapiz,
  IconeLixeira,
  IconeUpload,
  mesAtual,
  MesNav,
  mesLabel,
  Modal,
  StatusSync,
  TituloPagina,
} from '../ui';
import { useCatalogo } from './useCatalogo';

type Edicao = { kind: 'receita'; item: Receita } | { kind: 'despesa'; item: Despesa } | null;

export default function Lancamentos() {
  const { t } = useTranslation();
  const [mes, setMes] = useState(mesAtual);
  const [contaFiltro, setContaFiltro] = useState<number | ''>('');
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);

  const [tipo, setTipo] = useState<TipoLancamento>('despesa');
  const [modalNovo, setModalNovo] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [edicao, setEdicao] = useState<Edicao>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState<{
    path: string;
    descricao: string;
    grupoPath?: string;
    parcelaInfo?: string;
  } | null>(null);

  const { nomesPorTipo, formas, contas, contaPorId, corDe } = useCatalogo();

  async function recarregar() {
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
      setErro(e instanceof Error ? e.message : t('comum.falhaCarregar'));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    setCarregando(true);
    void recarregar();
  }, []);

  const receitasDoMes = useMemo(
    () =>
      receitas
        .filter((r) => r.data.startsWith(mes) && (contaFiltro === '' || r.contaId === contaFiltro))
        .sort((a, b) => b.data.localeCompare(a.data)),
    [receitas, mes, contaFiltro],
  );
  const despesasDoMes = useMemo(
    () =>
      despesas
        .filter((d) => d.data.startsWith(mes) && (contaFiltro === '' || d.contaId === contaFiltro))
        .sort((a, b) => b.data.localeCompare(a.data)),
    [despesas, mes, contaFiltro],
  );

  function abrirNovo() {
    setFormKey((k) => k + 1);
    setModalNovo(true);
  }

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
          ...(tipo === 'despesa' ? { parcelas: v.parcelas ?? 1 } : {}),
        }),
      });
      setModalNovo(false);
      setFormKey((k) => k + 1);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('comum.falhaSalvar'));
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
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('comum.falhaSalvar'));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(path: string) {
    try {
      setErro('');
      await api(path, { method: 'DELETE' });
      setConfirmarExclusao(null);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('comum.falhaExcluir'));
    }
  }

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <TituloPagina Icon={IconeExtrato}>{t('lancamentos.titulo')}</TituloPagina>
        <span className="flex-1" />
        <button
          type="button"
          onClick={abrirNovo}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {t('lancamentos.novo')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={contaFiltro}
          onChange={(e) => setContaFiltro(e.target.value === '' ? '' : Number(e.target.value))}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm outline-none"
          aria-label={t('comum.filtrarConta')}
        >
          <option value="">{t('comum.todasContas')}</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icone ? `${c.icone} ` : ''}{c.nome}
            </option>
          ))}
        </select>
        <MesNav mes={mes} onChange={setMes} />
        <Link
          to="/lancamentos/ofx"
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <IconeUpload className="h-4 w-4" />
          {t('lancamentos.importarOfx')}
        </Link>
      </div>

      <AlertaErro mensagem={erro} />

      <div className="space-y-6">
        <section
          aria-label={t('lancamentos.receitasMes')}
          className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
        >
          <h2 className="text-base font-bold">
            {t('lancamentos.receitasMes')} <span className="ml-1 text-sm font-medium text-slate-400 dark:text-slate-500">· {mesLabel(mes)} · {receitasDoMes.length}</span>
          </h2>
          {carregando ? (
            <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">{t('comum.carregando')}</p>
          ) : receitasDoMes.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              {t('lancamentos.nenhumaReceita')}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {receitasDoMes.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    +
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.origem}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      {formatarData(r.data)}
                      {contaPorId(r.contaId) && <span>· {contaPorId(r.contaId)}</span>}
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${corBadge(corDe(r.categoria, 'receita'))}`}
                      >
                        {r.categoria}
                      </span>
                      {r.formaPagamento && <span>· {r.formaPagamento}</span>}
                    </p>
                    {r.nota && <p className="truncate text-xs italic text-slate-400 dark:text-slate-500">{r.nota}</p>}
                  </div>
                  <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {BRL.format(r.valor)}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setEdicao({ kind: 'receita', item: r })}
                      aria-label={t('lancamentos.editarReceita', { nome: r.origem })}
                      title={t('comum.editar')}
                      className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
                    >
                      <IconeLapiz className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmarExclusao({ path: `/api/receitas/${r.id}`, descricao: r.origem })
                      }
                      aria-label={t('lancamentos.excluirReceita', { nome: r.origem })}
                      title={t('comum.excluir')}
                      className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600"
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
          aria-label={t('lancamentos.despesasMes')}
          className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
        >
          <h2 className="text-base font-bold">
            {t('lancamentos.despesasMes')} <span className="ml-1 text-sm font-medium text-slate-400 dark:text-slate-500">· {mesLabel(mes)} · {despesasDoMes.length}</span>
          </h2>
          {carregando ? (
            <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">{t('comum.carregando')}</p>
          ) : despesasDoMes.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              {t('lancamentos.nenhumaDespesa')}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {despesasDoMes.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950 text-sm font-bold text-rose-700 dark:text-rose-300">
                    −
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{d.descricao || d.categoria}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      {formatarData(d.data)}
                      {contaPorId(d.contaId) && <span>· {contaPorId(d.contaId)}</span>}
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${corBadge(corDe(d.categoria, 'despesa'))}`}
                      >
                        {d.categoria}
                      </span>
                      {d.formaPagamento && <span>· {d.formaPagamento}</span>}
                      {d.parcelaAtual && d.parcelaTotal && (
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-semibold text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-800">
                          {d.parcelaAtual}/{d.parcelaTotal}
                        </span>
                      )}
                    </p>
                    {d.nota && <p className="truncate text-xs italic text-slate-400 dark:text-slate-500">{d.nota}</p>}
                  </div>
                  <p className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-200">
                    {BRL.format(d.valor)}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => setEdicao({ kind: 'despesa', item: d })}
                      aria-label={t('lancamentos.editarDespesa', { nome: d.descricao || d.categoria })}
                      title={t('comum.editar')}
                      className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
                    >
                      <IconeLapiz className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfirmarExclusao({
                          path: `/api/despesas/${d.id}`,
                          descricao: d.descricao || d.categoria,
                          grupoPath: d.grupoParcela
                            ? `/api/despesas/${d.id}?escopo=grupo`
                            : undefined,
                          parcelaInfo:
                            d.parcelaAtual && d.parcelaTotal
                              ? `${d.parcelaAtual}/${d.parcelaTotal}`
                              : undefined,
                        })
                      }
                      aria-label={t('lancamentos.excluirDespesa', { nome: d.descricao || d.categoria })}
                      title={t('comum.excluir')}
                      className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600"
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

      <StatusSync carregando={carregando} erro={erro} sincronizadoEm={sincronizadoEm} />

      {modalNovo && (
        <Modal titulo={t('lancamentos.novoModal')} onFechar={() => setModalNovo(false)} wide>
          <LancamentoForm
            key={formKey}
            tipo={tipo}
            onTipoChange={setTipo}
            categoriasReceita={nomesPorTipo('receita')}
            categoriasDespesa={nomesPorTipo('despesa')}
            formas={formas}
            contas={contas}
            submitLabel={t('lancamentos.adicionarTipo', { tipo: t(`form.${tipo}`) })}
            submitting={salvando}
            onSubmit={criar}
            onErro={setErro}
          />
          <button
            type="button"
            onClick={() => setModalNovo(false)}
            className="mt-3 w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t('comum.cancelar')}
          </button>
        </Modal>
      )}

      {edicao && (
        <Modal titulo={t('lancamentos.editarModal', { kind: t(`form.${edicao.kind}`) })} onFechar={() => setEdicao(null)} wide>
          <LancamentoForm
            tipo={edicao.kind}
            categoriasReceita={nomesPorTipo('receita')}
            categoriasDespesa={nomesPorTipo('despesa')}
            formas={formas}
            contas={contas}
            initial={
              edicao.kind === 'receita'
                ? {
                    data: edicao.item.data,
                    valor: edicao.item.valor,
                    categoria: edicao.item.categoria,
                    origem: edicao.item.origem,
                    formaPagamento: edicao.item.formaPagamento,
                    contaId: edicao.item.contaId ?? '',
                    nota: edicao.item.nota ?? '',
                  }
                : {
                    data: edicao.item.data,
                    valor: edicao.item.valor,
                    categoria: edicao.item.categoria,
                    origem: edicao.item.descricao,
                    formaPagamento: edicao.item.formaPagamento,
                    contaId: edicao.item.contaId ?? '',
                    nota: edicao.item.nota ?? '',
                  }
            }
            submitLabel={t('lancamentos.salvarAlteracoes')}
            submitting={salvando}
            onSubmit={salvarEdicao}
            onErro={setErro}
          />
          <button
            type="button"
            onClick={() => setEdicao(null)}
            className="mt-3 w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {t('comum.cancelar')}
          </button>
        </Modal>
      )}

      {confirmarExclusao && !confirmarExclusao.grupoPath && (
        <ConfirmarExclusao
          descricao={confirmarExclusao.descricao}
          onCancelar={() => setConfirmarExclusao(null)}
          onConfirmar={() => excluir(confirmarExclusao.path)}
        />
      )}

      {confirmarExclusao?.grupoPath && (
        <Modal titulo={t('lancamentos.excluirParcelaTitulo')} onFechar={() => setConfirmarExclusao(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('lancamentos.excluirParcelaDescricao', {
              descricao: confirmarExclusao.descricao,
              info: confirmarExclusao.parcelaInfo,
            })}
          </p>
          <div className="mt-5 grid gap-2">
            <button
              type="button"
              onClick={() => excluir(confirmarExclusao.path)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {t('lancamentos.soParcela')}
            </button>
            <button
              type="button"
              onClick={() => excluir(confirmarExclusao.grupoPath!)}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
            >
              {t('lancamentos.todasParcelas')}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
