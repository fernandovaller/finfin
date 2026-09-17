import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, CORES_CATEGORIA, type Categoria } from '../api';
import {
  AlertaErro,
  ConfirmarExclusao,
  corBadge,
  corSwatch,
  IconeLapiz,
  IconeLixeira,
  IconeTag,
  Modal,
  StatusSync,
  TituloPagina,
} from '../ui';

type Tipo = 'despesa' | 'receita';

export default function Categorias() {
  const { t } = useTranslation();
  const [tipo, setTipo] = useState<Tipo>('despesa');
  const [itens, setItens] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);

  const [modalNovo, setModalNovo] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoCor, setNovoCor] = useState('slate');
  const [novoTipo, setNovoTipo] = useState<Tipo>('despesa');

  const [editando, setEditando] = useState<Categoria | null>(null);
  const [excluindo, setExcluindo] = useState<Categoria | null>(null);

  async function recarregar() {
    try {
      setErro('');
      setItens(await api<Categoria[]>('/api/categorias'));
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

  const visiveis = itens.filter((c) => c.tipo === tipo);

  function abrirNovo() {
    setNovoTipo(tipo);
    setNovoNome('');
    setNovoCor('slate');
    setModalNovo(true);
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      setErro('');
      await api('/api/categorias', {
        method: 'POST',
        body: JSON.stringify({ nome: novoNome, tipo: novoTipo, cor: novoCor }),
      });
      setModalNovo(false);
      setNovoNome('');
      if (novoTipo !== tipo) setTipo(novoTipo);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('comum.falhaSalvar'));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setSalvando(true);
    try {
      setErro('');
      await api(`/api/categorias/${editando.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: editando.nome, cor: editando.cor }),
      });
      setEditando(null);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('comum.falhaSalvar'));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!excluindo) return;
    try {
      setErro('');
      await api(`/api/categorias/${excluindo.id}`, { method: 'DELETE' });
      setExcluindo(null);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('comum.falhaExcluir'));
      setExcluindo(null);
    }
  }

  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200';

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <TituloPagina Icon={IconeTag}>{t('categorias.titulo')}</TituloPagina>
        <span className="flex-1" />
        <button
          type="button"
          onClick={abrirNovo}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {t('categorias.nova')}
        </button>
      </div>
      <AlertaErro mensagem={erro} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="grid w-full max-w-xs grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-sm font-semibold sm:w-auto">
          {(['despesa', 'receita'] as const).map((t2) => (
            <button
              key={t2}
              type="button"
              onClick={() => setTipo(t2)}
              aria-pressed={tipo === t2}
              className={`rounded-lg px-4 py-2 capitalize transition ${
                tipo === t2
                  ? 'bg-slate-900 text-white shadow dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t(`form.${t2}`)}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          {t('categorias.contagem', {
            count: visiveis.length,
            tipo: t(tipo === 'receita' ? 'categorias.tipoReceitas' : 'categorias.tipoDespesas'),
          })}
        </p>
      </div>

      <section
        aria-label={t('categorias.listaLabel')}
        className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
      >
        {carregando ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t('comum.carregando')}</p>
        ) : visiveis.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {t('categorias.vazia', { tipo: t(`form.${tipo}`) })}
            </p>
            <button
              type="button"
              onClick={abrirNovo}
              className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              {t('categorias.criarPrimeira')}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {visiveis.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <span className={`h-4 w-4 shrink-0 rounded-full ${corSwatch(c.cor)}`} />
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${corBadge(c.cor)}`}
                >
                  {c.nome}
                </span>
                <span className="flex-1" />
                <button
                  type="button"
                  onClick={() => setEditando(c)}
                  aria-label={t('categorias.editarAria', { nome: c.nome })}
                  title={t('comum.editar')}
                  className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
                >
                  <IconeLapiz className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setExcluindo(c)}
                  aria-label={t('categorias.excluirAria', { nome: c.nome })}
                  title={t('comum.excluir')}
                  className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600"
                >
                  <IconeLixeira className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <StatusSync carregando={carregando} erro={erro} sincronizadoEm={sincronizadoEm} />

      {modalNovo && (
        <Modal titulo={t('categorias.novaModal')} onFechar={() => setModalNovo(false)}>
          <form onSubmit={adicionar} className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-sm font-semibold">
              {(['despesa', 'receita'] as const).map((t2) => (
                <button
                  key={t2}
                  type="button"
                  onClick={() => setNovoTipo(t2)}
                  aria-pressed={novoTipo === t2}
                  className={`rounded-lg px-3 py-2 capitalize transition ${
                    novoTipo === t2
                      ? 'bg-slate-900 text-white shadow dark:bg-slate-100 dark:text-slate-900'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t(`form.${t2}`)}
                </button>
              ))}
            </div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('categorias.nome')}
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                required
                autoFocus
                placeholder={novoTipo === 'receita' ? t('categorias.placeholderReceita') : t('categorias.placeholderDespesa')}
                className={inputCls}
              />
            </label>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('categorias.cor')}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {CORES_CATEGORIA.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNovoCor(c)}
                    aria-label={t('categorias.corNome', { cor: c })}
                    aria-pressed={novoCor === c}
                    className={`h-8 w-8 rounded-full transition ${corSwatch(c)} ${
                      novoCor === c ? 'ring-2 ring-slate-900 ring-offset-2' : 'opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModalNovo(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {t('comum.cancelar')}
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
              >
                {salvando ? t('comum.salvando') : t('comum.adicionar')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editando && (
        <Modal titulo={t('categorias.editarModal', { nome: editando.nome })} onFechar={() => setEditando(null)}>
          <form onSubmit={salvarEdicao} className="space-y-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('categorias.nome')}
              <input
                value={editando.nome}
                onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                required
                autoFocus
                className={inputCls}
              />
            </label>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('categorias.cor')}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {CORES_CATEGORIA.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditando({ ...editando, cor: c })}
                    aria-label={t('categorias.corNome', { cor: c })}
                    aria-pressed={editando.cor === c}
                    className={`h-8 w-8 rounded-full transition ${corSwatch(c)} ${
                      editando.cor === c
                        ? 'ring-2 ring-slate-900 ring-offset-2'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setEditando(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {t('comum.cancelar')}
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {salvando ? t('comum.salvando') : t('comum.salvar')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {excluindo && (
        <ConfirmarExclusao
          descricao={t('categorias.excluirDescricao', { nome: excluindo.nome })}
          onCancelar={() => setExcluindo(null)}
          onConfirmar={excluir}
        />
      )}
    </main>
  );
}
