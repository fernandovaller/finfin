import { useEffect, useState } from 'react';
import { api, type Conta } from '../api';
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

export default function Contas() {
  const [itens, setItens] = useState<Conta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);

  const [modalNovo, setModalNovo] = useState(false);
  const [form, setForm] = useState(vazio);
  const [editando, setEditando] = useState<Conta | null>(null);
  const [excluindo, setExcluindo] = useState<Conta | null>(null);

  async function recarregar() {
    try {
      setErro('');
      setItens(await api<Conta[]>('/api/contas'));
      setSincronizadoEm(new Date());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar dados');
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

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      setErro('');
      await api('/api/contas', {
        method: 'POST',
        body: JSON.stringify({
          nome: form.nome,
          saldoInicial: Number(form.saldoInicial) || 0,
          nota: form.nota,
          icone: form.icone,
          principal: form.principal,
        }),
      });
      setModalNovo(false);
      setForm(vazio);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao salvar');
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
          saldoInicial: editando.saldoInicial,
          nota: editando.nota ?? '',
          icone: editando.icone ?? '',
          principal: editando.principal ?? false,
        }),
      });
      setEditando(null);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao salvar');
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
      setErro(err instanceof Error ? err.message : 'Falha ao excluir');
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
        Cancelar
      </button>
      <button
        type="submit"
        disabled={salvando}
        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
      >
        {salvando ? 'Salvando…' : label}
      </button>
    </div>
  );

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-3">
        <TituloPagina Icon={IconeCarteira}>Contas</TituloPagina>
        <span className="flex-1" />
        <button
          type="button"
          onClick={abrirNovo}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          + Nova conta
        </button>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Cada lançamento pertence a uma conta (ex.: Cartão de crédito, Cartão de débito, Carteira).
      </p>
      <AlertaErro mensagem={erro} />

      <p className="text-sm text-slate-400 dark:text-slate-500">
        {itens.length} {itens.length === 1 ? 'conta' : 'contas'} cadastradas
      </p>

      <section
        aria-label="Contas cadastradas"
        className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800"
      >
        {carregando ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Carregando…</p>
        ) : itens.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-400 dark:text-slate-500">Nenhuma conta cadastrada.</p>
            <button
              type="button"
              onClick={abrirNovo}
              className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              Criar primeira conta
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
                        Principal
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
                  onClick={() => setEditando(c)}
                  aria-label={`Editar ${c.nome}`}
                  title="Editar"
                  className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-200"
                >
                  <IconeLapiz className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setExcluindo(c)}
                  aria-label={`Excluir ${c.nome}`}
                  title="Excluir"
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
        <Modal titulo="Nova conta" onFechar={() => setModalNovo(false)}>
          <form onSubmit={adicionar} className="space-y-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              Descrição
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                autoFocus
                placeholder="Ex.: Cartão de crédito"
                className={inputCls}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                Saldo inicial (R$)
                <input
                  type="number"
                  step="0.01"
                  value={form.saldoInicial}
                  onChange={(e) => setForm({ ...form, saldoInicial: e.target.value })}
                  placeholder="0,00"
                  className={`${inputCls} tabular-nums`}
                />
              </label>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                Ícone
                <select
                  value={form.icone}
                  onChange={(e) => setForm({ ...form, icone: e.target.value })}
                  className={inputCls}
                >
                  {ICONES.map((i) => (
                    <option key={i} value={i}>
                      {i === '' ? 'Sem ícone' : i}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              Nota
              <input
                value={form.nota}
                onChange={(e) => setForm({ ...form, nota: e.target.value })}
                placeholder="Observação opcional"
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
              Conta principal
            </label>
            {botoesModal(() => setModalNovo(false), 'Adicionar')}
          </form>
        </Modal>
      )}

      {editando && (
        <Modal titulo={`Editar "${editando.nome}"`} onFechar={() => setEditando(null)}>
          <form onSubmit={salvarEdicao} className="space-y-4">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              Descrição
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
                Saldo inicial (R$)
                <input
                  type="number"
                  step="0.01"
                  value={editando.saldoInicial}
                  onChange={(e) =>
                    setEditando({ ...editando, saldoInicial: Number(e.target.value) || 0 })
                  }
                  className={`${inputCls} tabular-nums`}
                />
              </label>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
                Ícone
                <select
                  value={editando.icone ?? ''}
                  onChange={(e) => setEditando({ ...editando, icone: e.target.value })}
                  className={inputCls}
                >
                  {ICONES.map((i) => (
                    <option key={i} value={i}>
                      {i === '' ? 'Sem ícone' : i}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              Nota
              <input
                value={editando.nota ?? ''}
                onChange={(e) => setEditando({ ...editando, nota: e.target.value })}
                placeholder="Observação opcional"
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
              Conta principal
            </label>
            {botoesModal(() => setEditando(null), 'Salvar')}
          </form>
        </Modal>
      )}

      {excluindo && (
        <ConfirmarExclusao
          descricao={`conta "${excluindo.nome}"`}
          onCancelar={() => setExcluindo(null)}
          onConfirmar={excluir}
        />
      )}
    </main>
  );
}
