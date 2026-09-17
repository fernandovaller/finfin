import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type FormaPagamento } from '../api';
import {
  AlertaErro,
  ConfirmarExclusao,
  IconeCarteira,
  IconeLapiz,
  IconeLixeira,
  Modal,
  StatusSync,
  TituloPagina,
} from '../ui';

export default function FormasPagamento() {
  const { t } = useTranslation();
  const [itens, setItens] = useState<FormaPagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);

  const [modalNovo, setModalNovo] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [editando, setEditando] = useState<FormaPagamento | null>(null);
  const [excluindo, setExcluindo] = useState<FormaPagamento | null>(null);

  async function recarregar() {
    try {
      setErro('');
      setItens(await api<FormaPagamento[]>('/api/formas-pagamento'));
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

  function abrirNovo() {
    setNovoNome('');
    setModalNovo(true);
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      setErro('');
      await api('/api/formas-pagamento', {
        method: 'POST',
        body: JSON.stringify({ nome: novoNome }),
      });
      setModalNovo(false);
      setNovoNome('');
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
      await api(`/api/formas-pagamento/${editando.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: editando.nome }),
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
      await api(`/api/formas-pagamento/${excluindo.id}`, { method: 'DELETE' });
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
        <TituloPagina Icon={IconeCarteira}>{t('formas.titulo')}</TituloPagina>
        <span className="flex-1" />
        <button
          type="button"
          onClick={abrirNovo}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {t('formas.nova')}
        </button>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t('formas.ajuda')}
      </p>
      <AlertaErro mensagem={erro} />

      <p className="text-sm text-slate-400 dark:text-slate-500">
        {t('formas.contagem', { count: itens.length })}
      </p>

      <section
        aria-label={t('formas.listaLabel')}
        className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
      >
        {carregando ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t('comum.carregando')}</p>
        ) : itens.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {t('formas.vazia')}
            </p>
            <button
              type="button"
              onClick={abrirNovo}
              className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              {t('formas.criarPrimeira')}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {itens.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{f.nome}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditando(f)}
                  aria-label={t('formas.editarAria', { nome: f.nome })}
                  title={t('comum.editar')}
                  className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
                >
                  <IconeLapiz className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setExcluindo(f)}
                  aria-label={t('formas.excluirAria', { nome: f.nome })}
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
        <Modal titulo={t('formas.novaModal')} onFechar={() => setModalNovo(false)}>
          <form onSubmit={adicionar} className="space-y-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('formas.nome')}
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                required
                autoFocus
                placeholder={t('formas.nomePlaceholder')}
                className={inputCls}
              />
            </label>
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
        <Modal titulo={t('formas.editarModal', { nome: editando.nome })} onFechar={() => setEditando(null)}>
          <form onSubmit={salvarEdicao} className="space-y-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('formas.nome')}
              <input
                value={editando.nome}
                onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                required
                autoFocus
                className={inputCls}
              />
            </label>
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
          descricao={t('formas.excluirDescricao', { nome: excluindo.nome })}
          onCancelar={() => setExcluindo(null)}
          onConfirmar={excluir}
        />
      )}
    </main>
  );
}
