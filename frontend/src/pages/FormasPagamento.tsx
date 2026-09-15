import { useEffect, useState } from 'react';
import { api, type FormaPagamento } from '../api';
import {
  AlertaErro,
  ConfirmarExclusao,
  IconeCarteira,
  IconeLapiz,
  IconeLixeira,
  StatusSync,
  TituloPagina,
} from '../ui';

export default function FormasPagamento() {
  const [itens, setItens] = useState<FormaPagamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);

  const [nome, setNome] = useState('');
  const [editando, setEditando] = useState<FormaPagamento | null>(null);
  const [excluindo, setExcluindo] = useState<FormaPagamento | null>(null);

  async function recarregar() {
    try {
      setErro('');
      setItens(await api<FormaPagamento[]>('/api/formas-pagamento'));
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
      await api('/api/formas-pagamento', {
        method: 'POST',
        body: JSON.stringify({ nome }),
      });
      setNome('');
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
      await api(`/api/formas-pagamento/${editando.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: editando.nome }),
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
      await api(`/api/formas-pagamento/${excluindo.id}`, { method: 'DELETE' });
      setExcluindo(null);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao excluir');
      setExcluindo(null);
    }
  }

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <TituloPagina Icon={IconeCarteira}>Formas de pagamento</TituloPagina>
      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
        Texto simples usado nos lançamentos (ex.: PIX, Crédito à vista).
      </p>
      <AlertaErro mensagem={erro} />

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <section
          aria-label="Nova forma de pagamento"
          className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-2"
        >
          <h2 className="text-base font-bold">Nova forma</h2>
          <form onSubmit={adicionar} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
              Nome
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder="Ex.: PIX"
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            <button
              type="submit"
              disabled={salvando}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
            >
              {salvando ? 'Salvando…' : 'Adicionar forma'}
            </button>
          </form>
        </section>

        <section
          aria-label="Formas cadastradas"
          className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-3"
        >
          <h2 className="text-base font-bold">Cadastradas</h2>
          {carregando ? (
            <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">Carregando…</p>
          ) : itens.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              Nenhuma forma de pagamento cadastrada.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {itens.map((f) =>
                editando?.id === f.id ? (
                  <li key={f.id} className="py-3">
                    <form onSubmit={salvarEdicao} className="flex flex-wrap items-center gap-2">
                      <input
                        value={editando.nome}
                        onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                        required
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      />
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
                        className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-bold text-slate-600 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                    </form>
                  </li>
                ) : (
                  <li key={f.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{f.nome}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditando(f)}
                      aria-label={`Editar ${f.nome}`}
                      title="Editar"
                      className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500 dark:hover:text-slate-200"
                    >
                      <IconeLapiz className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExcluindo(f)}
                      aria-label={`Excluir ${f.nome}`}
                      title="Excluir"
                      className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 dark:bg-red-950/50 hover:text-red-600"
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
          descricao={`forma de pagamento "${excluindo.nome}"`}
          onCancelar={() => setExcluindo(null)}
          onConfirmar={excluir}
        />
      )}
    </main>
  );
}
