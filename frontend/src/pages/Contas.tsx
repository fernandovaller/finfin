import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type Conta } from '../api';
import { localeIntl } from '../i18n';
import {
  AlertaErro,
  BRL,
  ConfirmarExclusao,
  IconeCarteira,
  IconeLapiz,
  IconeLixeira,
  Modal,
  StatusSync,
  TituloPagina,
} from '../ui';

const ICONES = ['', '💰', '🏦', '💳', '💵', '📈', '🐷', '✈️', '🏠', '🚗'];

const vazio = { nome: '', saldoInicial: '', nota: '', icone: '', principal: false };

/** Máscara de moeda: dígitos digitados viram centavos (ex.: "25000" → "250,00"). Aceita "-" inicial (saldo devedor). */
function mascaraMoeda(digitos: string): string {
  if (digitos === '' || digitos === '-') return '';
  const negativo = digitos.startsWith('-');
  const soDigitos = negativo ? digitos.slice(1) : digitos;
  if (soDigitos === '') return '';
  const formatado = (Number(soDigitos) / 100).toLocaleString(localeIntl(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return negativo ? `-${formatado}` : formatado;
}

/** Do input formatado de volta para dígitos (preserva "-" inicial, teto de 12 dígitos). */
function textoParaDigitos(bruto: string): string {
  const negativo = bruto.trim().startsWith('-');
  const digitos = bruto.replace(/\D/g, '').slice(0, 12);
  if (digitos === '') return negativo ? '-' : '';
  return (negativo ? '-' : '') + digitos;
}

/** Dígitos em centavos → número (vazio vira 0). */
function digitosParaNumero(digitos: string): number {
  if (digitos === '' || digitos === '-') return 0;
  const negativo = digitos.startsWith('-');
  const valor = Number(negativo ? digitos.slice(1) : digitos) / 100;
  return negativo ? -valor : valor;
}

export default function Contas() {
  const { t } = useTranslation();
  const [itens, setItens] = useState<Conta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);

  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState(vazio);
  const [editando, setEditando] = useState<Conta | null>(null);
  const [saldoEdicao, setSaldoEdicao] = useState('');
  const [excluindo, setExcluindo] = useState<Conta | null>(null);

  async function recarregar() {
    try {
      setErro('');
      setItens(await api<Conta[]>('/api/contas'));
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
    setForm(vazio);
    setModalNovo(true);
  }

  function abrirEdicao(c: Conta) {
    setEditando(c);
    setSaldoEdicao(String(Math.round(c.saldoInicial * 100)));
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      setErro('');
      await api('/api/contas', {
        method: 'POST',
        body: JSON.stringify({
          nome: form.nome,
          saldoInicial: digitosParaNumero(form.saldoInicial),
          nota: form.nota,
          icone: form.icone,
          principal: form.principal,
        }),
      });
      setModalNovo(false);
      setForm(vazio);
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
      await api(`/api/contas/${editando.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nome: editando.nome,
          saldoInicial: digitosParaNumero(saldoEdicao),
          nota: editando.nota ?? '',
          icone: editando.icone ?? '',
          principal: editando.principal ?? false,
        }),
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
      await api(`/api/contas/${excluindo.id}`, { method: 'DELETE' });
      setExcluindo(null);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('comum.falhaExcluir'));
      setExcluindo(null);
    }
  }

  const inputCls =
    'mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200';

  const botoesModal = (onCancelar: () => void, label: string) => (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={onCancelar}
        className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        {t('comum.cancelar')}
      </button>
      <button
        type="submit"
        disabled={salvando}
        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
      >
        {salvando ? t('comum.salvando') : label}
      </button>
    </div>
  );

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <TituloPagina Icon={IconeCarteira}>{t('contas.titulo')}</TituloPagina>
        <span className="flex-1" />
        <button
          type="button"
          onClick={abrirNovo}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {t('contas.nova')}
        </button>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t('contas.ajuda')}
      </p>
      <AlertaErro mensagem={erro} />

      <p className="text-sm text-slate-400 dark:text-slate-500">
        {t('contas.contagem', { count: itens.length })}
      </p>

      <section
        aria-label={t('contas.listaLabel')}
        className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
      >
        {carregando ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t('comum.carregando')}</p>
        ) : itens.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">{t('contas.vazia')}</p>
            <button
              type="button"
              onClick={abrirNovo}
              className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              {t('contas.criarPrimeira')}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {itens.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-base">
                  {c.icone || '💰'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {c.nome}
                    {c.principal && (
                      <span className="ml-2 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        {t('contas.principal')}
                      </span>
                    )}
                  </p>
                  {c.nota && <p className="truncate text-xs text-slate-400 dark:text-slate-500">{c.nota}</p>}
                </div>
                <span className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                  {BRL.format(c.saldoInicial)}
                </span>
                <button
                  type="button"
                  onClick={() => abrirEdicao(c)}
                  aria-label={t('contas.editarAria', { nome: c.nome })}
                  title={t('comum.editar')}
                  className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
                >
                  <IconeLapiz className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setExcluindo(c)}
                  aria-label={t('contas.excluirAria', { nome: c.nome })}
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
        <Modal titulo={t('contas.novaModal')} onFechar={() => setModalNovo(false)}>
          <form onSubmit={adicionar} className="space-y-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('contas.descricao')}
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                autoFocus
                placeholder={t('contas.descricaoPlaceholder')}
                className={inputCls}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                {t('contas.saldoInicial')}
                <input
                  type="text"
                  inputMode="numeric"
                  value={mascaraMoeda(form.saldoInicial)}
                  onChange={(e) => setForm({ ...form, saldoInicial: textoParaDigitos(e.target.value) })}
                  placeholder="0,00"
                  className={`${inputCls} tabular-nums`}
                />
              </label>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                {t('contas.icone')}
                <select
                  value={form.icone}
                  onChange={(e) => setForm({ ...form, icone: e.target.value })}
                  className={inputCls}
                >
                  {ICONES.map((i) => (
                    <option key={i} value={i}>
                      {i === '' ? t('contas.semIcone') : i}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('form.nota')}
              <input
                value={form.nota}
                onChange={(e) => setForm({ ...form, nota: e.target.value })}
                placeholder={t('form.notaPlaceholder')}
                className={inputCls}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={form.principal}
                onChange={(e) => setForm({ ...form, principal: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 accent-emerald-600"
              />
              {t('contas.contaPrincipal')}
            </label>
            {botoesModal(() => setModalNovo(false), t('comum.adicionar'))}
          </form>
        </Modal>
      )}

      {editando && (
        <Modal titulo={t('contas.editarModal', { nome: editando.nome })} onFechar={() => setEditando(null)}>
          <form onSubmit={salvarEdicao} className="space-y-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('contas.descricao')}
              <input
                value={editando.nome}
                onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                required
                autoFocus
                className={inputCls}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                {t('contas.saldoInicial')}
                <input
                  type="text"
                  inputMode="numeric"
                  value={mascaraMoeda(saldoEdicao)}
                  onChange={(e) => setSaldoEdicao(textoParaDigitos(e.target.value))}
                  placeholder="0,00"
                  className={`${inputCls} tabular-nums`}
                />
              </label>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                {t('contas.icone')}
                <select
                  value={editando.icone ?? ''}
                  onChange={(e) => setEditando({ ...editando, icone: e.target.value })}
                  className={inputCls}
                >
                  {ICONES.map((i) => (
                    <option key={i} value={i}>
                      {i === '' ? t('contas.semIcone') : i}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('form.nota')}
              <input
                value={editando.nota ?? ''}
                onChange={(e) => setEditando({ ...editando, nota: e.target.value })}
                placeholder={t('form.notaPlaceholder')}
                className={inputCls}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={editando.principal ?? false}
                onChange={(e) => setEditando({ ...editando, principal: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 accent-emerald-600"
              />
              {t('contas.contaPrincipal')}
            </label>
            {botoesModal(() => setEditando(null), t('comum.salvar'))}
          </form>
        </Modal>
      )}

      {excluindo && (
        <ConfirmarExclusao
          descricao={t('contas.excluirDescricao', { nome: excluindo.nome })}
          onCancelar={() => setExcluindo(null)}
          onConfirmar={excluir}
        />
      )}
    </main>
  );
}
