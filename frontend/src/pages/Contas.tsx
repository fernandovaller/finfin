import { useEffect, useState } from 'react';
import { api, type Conta } from '../api';
import {
  AlertaErro,
  BRL,
  ConfirmarExclusao,
  IconeLapiz,
  IconeLixeira,
  StatusSync,
} from '../ui';

const ICONES = ['', '💰', '🏦', '💳', '💵', '📈', '🐷', '✈️', '🏠', '🚗'];

const vazio = { nome: '', saldoInicial: '', nota: '', icone: '', principal: false };

export default function Contas() {
  const [itens, setItens] = useState<Conta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);

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
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200';

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <h1 className="text-xl font-bold tracking-tight">Contas</h1>
      <p className="text-sm text-slate-500">
        Cada lançamento pertence a uma conta (ex.: Cartão de crédito, Cartão de débito, Carteira).
      </p>
      <AlertaErro mensagem={erro} />

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <section
          aria-label="Nova conta"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:col-span-2"
        >
          <h2 className="text-base font-bold">Nova conta</h2>
          <form onSubmit={adicionar} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-600">
              Descrição
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
                placeholder="Ex.: Cartão de crédito"
                className={inputCls}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-600">
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
              <label className="block text-sm font-medium text-slate-600">
                Ícone
                <select
                  value={form.icone}
                  onChange={(e) => setForm({ ...form, icone: e.target.value })}
                  className={`${inputCls} bg-white`}
                >
                  {ICONES.map((i) => (
                    <option key={i} value={i}>
                      {i === '' ? 'Sem ícone' : i}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-600">
              Nota
              <input
                value={form.nota}
                onChange={(e) => setForm({ ...form, nota: e.target.value })}
                placeholder="Observação opcional"
                className={inputCls}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={form.principal}
                onChange={(e) => setForm({ ...form, principal: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
              />
              Conta principal
            </label>
            <button
              type="submit"
              disabled={salvando}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
            >
              {salvando ? 'Salvando…' : 'Adicionar conta'}
            </button>
          </form>
        </section>

        <section
          aria-label="Contas cadastradas"
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:col-span-3"
        >
          <h2 className="text-base font-bold">Cadastradas</h2>
          {carregando ? (
            <p className="mt-3 text-sm text-slate-400">Carregando…</p>
          ) : itens.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
              Nenhuma conta cadastrada.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {itens.map((c) =>
                editando?.id === c.id ? (
                  <li key={c.id} className="py-3">
                    <form onSubmit={salvarEdicao} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={editando.nome}
                          onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                          required
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                          aria-label="Descrição"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={editando.saldoInicial}
                          onChange={(e) =>
                            setEditando({ ...editando, saldoInicial: Number(e.target.value) || 0 })
                          }
                          className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm tabular-nums outline-none"
                          aria-label="Saldo inicial"
                        />
                        <select
                          value={editando.icone ?? ''}
                          onChange={(e) => setEditando({ ...editando, icone: e.target.value })}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none"
                          aria-label="Ícone"
                        >
                          {ICONES.map((i) => (
                            <option key={i} value={i}>
                              {i === '' ? 'Sem ícone' : i}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        value={editando.nota ?? ''}
                        onChange={(e) => setEditando({ ...editando, nota: e.target.value })}
                        placeholder="Nota"
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        aria-label="Nota"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={editando.principal ?? false}
                            onChange={(e) =>
                              setEditando({ ...editando, principal: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-slate-300 accent-emerald-600"
                          />
                          Principal
                        </label>
                        <span className="flex-1" />
                        <button
                          type="submit"
                          disabled={salvando}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando(null)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li key={c.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base">
                      {c.icone || '💰'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {c.nome}
                        {c.principal && (
                          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                            Principal
                          </span>
                        )}
                      </p>
                      {c.nota && <p className="truncate text-xs text-slate-400">{c.nota}</p>}
                    </div>
                    <span className="text-sm tabular-nums text-slate-500">
                      {BRL.format(c.saldoInicial)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditando(c)}
                      aria-label={`Editar ${c.nome}`}
                      title="Editar"
                      className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <IconeLapiz className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExcluindo(c)}
                      aria-label={`Excluir ${c.nome}`}
                      title="Excluir"
                      className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <IconeLixeira className="h-4 w-4" />
                    </button>
                  </li>
                ),
              )}
            </ul>
          )}
        </section>
      </div>

      <StatusSync carregando={carregando} erro={erro} sincronizadoEm={sincronizadoEm} />

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
