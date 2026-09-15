import { useEffect, useState } from 'react';
import { api, CORES_CATEGORIA, type Categoria } from '../api';
import {
  AlertaErro,
  ConfirmarExclusao,
  corBadge,
  corSwatch,
  IconeLapiz,
  IconeLixeira,
  IconeTag,
  StatusSync,
  TituloPagina,
} from '../ui';

type Tipo = 'despesa' | 'receita';

export default function Categorias() {
  const [tipo, setTipo] = useState<Tipo>('despesa');
  const [itens, setItens] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);

  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('slate');
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [excluindo, setExcluindo] = useState<Categoria | null>(null);

  async function recarregar() {
    try {
      setErro('');
      setItens(await api<Categoria[]>('/api/categorias'));
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

  const visiveis = itens.filter((c) => c.tipo === tipo);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      setErro('');
      await api('/api/categorias', { method: 'POST', body: JSON.stringify({ nome, tipo, cor }) });
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
      await api(`/api/categorias/${editando.id}`, {
        method: 'PUT',
        body: JSON.stringify({ nome: editando.nome, cor: editando.cor }),
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
      await api(`/api/categorias/${excluindo.id}`, { method: 'DELETE' });
      setExcluindo(null);
      await recarregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao excluir');
      setExcluindo(null);
    }
  }

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <TituloPagina Icon={IconeTag}>Categorias</TituloPagina>
      <AlertaErro mensagem={erro} />

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <section
          aria-label="Nova categoria"
          className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-2"
        >
          <h2 className="text-base font-bold">Nova categoria</h2>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-sm font-semibold">
            {(['despesa', 'receita'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`rounded-lg px-3 py-2 capitalize transition ${
                  tipo === t ? 'bg-slate-900 text-white shadow' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:text-slate-200 dark:hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <form onSubmit={adicionar} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
              Nome
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                placeholder={tipo === 'receita' ? 'Ex.: Salário' : 'Ex.: Lazer'}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">Cor</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {CORES_CATEGORIA.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    aria-label={`Cor ${c}`}
                    aria-pressed={cor === c}
                    className={`h-8 w-8 rounded-full transition ${corSwatch(c)} ${
                      cor === c ? 'ring-2 ring-slate-900 ring-offset-2' : 'opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={salvando}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
            >
              {salvando ? 'Salvando…' : 'Adicionar categoria'}
            </button>
          </form>
        </section>

        <section
          aria-label="Categorias cadastradas"
          className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 lg:col-span-3"
        >
          <h2 className="text-base font-bold capitalize">De {tipo === 'receita' ? 'receitas' : 'despesas'}</h2>
          {carregando ? (
            <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">Carregando…</p>
          ) : visiveis.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              Nenhuma categoria de {tipo} cadastrada.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {visiveis.map((c) =>
                editando?.id === c.id ? (
                  <li key={c.id} className="py-3">
                    <form onSubmit={salvarEdicao} className="flex flex-wrap items-center gap-2">
                      <input
                        value={editando.nome}
                        onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                        required
                        className="min-w-0 flex-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      />
                      <select
                        value={editando.cor}
                        onChange={(e) => setEditando({ ...editando, cor: e.target.value })}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm outline-none"
                        aria-label="Cor"
                      >
                        {CORES_CATEGORIA.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
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
                      aria-label={`Editar categoria ${c.nome}`}
                      title="Editar"
                      className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 hover:text-slate-600 dark:text-slate-400 dark:text-slate-500 dark:hover:text-slate-200"
                    >
                      <IconeLapiz className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExcluindo(c)}
                      aria-label={`Excluir categoria ${c.nome}`}
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
          descricao={`categoria "${excluindo.nome}"`}
          onCancelar={() => setExcluindo(null)}
          onConfirmar={excluir}
        />
      )}
    </main>
  );
}
