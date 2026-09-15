import { useEffect, useState } from 'react';
import { api } from '../api';
import { AlertaErro, Modal, StatusSync } from '../ui';

interface Contagem {
  contas: number;
  receitas: number;
  despesas: number;
  categorias: number;
  formasPagamento: number;
}

function baixar(filename: string, conteudo: string, tipo: string) {
  const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type Perigo = { path: string; titulo: string; detalhe: string } | null;

export default function Configuracoes() {
  const [contagem, setContagem] = useState<Contagem | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [trabalhando, setTrabalhando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);
  const [perigo, setPerigo] = useState<Perigo>(null);
  const [confirmacao, setConfirmacao] = useState('');

  async function recarregar() {
    try {
      setErro('');
      setContagem(await api<Contagem>('/api/contagem'));
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

  async function exportarJSON() {
    setTrabalhando(true);
    try {
      setErro('');
      setOk('');
      const dados = await api<Record<string, unknown>>('/api/exportar');
      baixar(
        `finfin-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(dados, null, 2),
        'application/json',
      );
      setOk('Backup JSON exportado.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao exportar');
    } finally {
      setTrabalhando(false);
    }
  }

  async function exportarCSV(tipo: 'receitas' | 'despesas') {
    setTrabalhando(true);
    try {
      setErro('');
      setOk('');
      const { filename, csv } = await api<{ filename: string; csv: string }>(
        `/api/exportar/csv?tipo=${tipo}`,
      );
      baixar(filename, `﻿${csv}`, 'text/csv');
      setOk(`CSV de ${tipo} exportado.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao exportar');
    } finally {
      setTrabalhando(false);
    }
  }

  async function restaurar() {
    setTrabalhando(true);
    try {
      setErro('');
      setOk('');
      const r = await api<{ categorias: number; formas: number }>('/api/restaurar', {
        method: 'POST',
      });
      setOk(
        r.categorias + r.formas === 0
          ? 'Catálogo já estava completo — nada a restaurar.'
          : `Restaurados ${r.categorias} categoria(s) e ${r.formas} forma(s).`,
      );
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao restaurar');
    } finally {
      setTrabalhando(false);
    }
  }

  async function executarPerigo() {
    if (!perigo || confirmacao.trim().toUpperCase() !== 'APAGAR') return;
    setTrabalhando(true);
    try {
      setErro('');
      setOk('');
      const r = await api<Record<string, number>>(perigo.path, { method: 'DELETE' });
      const total = Object.values(r).reduce((s, n) => s + n, 0);
      setOk(`Apagados ${total} registro(s).`);
      setPerigo(null);
      setConfirmacao('');
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao apagar');
    } finally {
      setTrabalhando(false);
    }
  }

  const itens: Array<[string, number | undefined]> = [
    ['Contas', contagem?.contas],
    ['Receitas', contagem?.receitas],
    ['Despesas', contagem?.despesas],
    ['Categorias', contagem?.categorias],
    ['Formas de pagamento', contagem?.formasPagamento],
  ];

  const card = 'rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200';
  const btnSec =
    'rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60';
  const btnDanger =
    'rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60';

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
      <AlertaErro mensagem={erro} />
      {ok && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
          {ok}
        </p>
      )}

      <section aria-label="Seus dados" className={card}>
        <h2 className="text-base font-bold">Seus dados</h2>
        {carregando ? (
          <p className="mt-3 text-sm text-slate-400">Carregando…</p>
        ) : (
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {itens.map(([rotulo, n]) => (
              <div key={rotulo} className="rounded-xl bg-slate-50 px-3 py-2.5 text-center ring-1 ring-inset ring-slate-100">
                <dt className="text-xs font-medium text-slate-500">{rotulo}</dt>
                <dd className="mt-0.5 text-xl font-bold tabular-nums">{n ?? '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section aria-label="Exportar dados" className={card}>
        <h2 className="text-base font-bold">Exportar dados</h2>
        <p className="mt-1 text-sm text-slate-500">
          Baixe uma cópia dos seus lançamentos e contas para backup ou planilha.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={exportarJSON} disabled={trabalhando} className={btnSec}>
            Backup completo (JSON)
          </button>
          <button type="button" onClick={() => exportarCSV('receitas')} disabled={trabalhando} className={btnSec}>
            Receitas (CSV)
          </button>
          <button type="button" onClick={() => exportarCSV('despesas')} disabled={trabalhando} className={btnSec}>
            Despesas (CSV)
          </button>
        </div>
      </section>

      <section aria-label="Catálogo" className={card}>
        <h2 className="text-base font-bold">Catálogo</h2>
        <p className="mt-1 text-sm text-slate-500">
          Repõe categorias e formas de pagamento padrão que foram excluídas, sem duplicar o que já existe.
        </p>
        <div className="mt-4">
          <button type="button" onClick={restaurar} disabled={trabalhando} className={btnSec}>
            Restaurar itens padrão
          </button>
        </div>
      </section>

      <section aria-label="Zona de perigo" className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-red-200">
        <h2 className="text-base font-bold text-red-700">Zona de perigo</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ações irreversíveis. Exporte um backup antes, se precisar dos dados.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setPerigo({
                path: '/api/dados/lancamentos',
                titulo: 'Apagar lançamentos?',
                detalhe: 'Todas as receitas e despesas serão apagadas. Contas e catálogo são mantidos.',
              })
            }
            className={btnDanger}
          >
            Apagar lançamentos
          </button>
          <button
            type="button"
            onClick={() =>
              setPerigo({
                path: '/api/dados/tudo',
                titulo: 'Apagar lançamentos e contas?',
                detalhe: 'Receitas, despesas e contas serão apagadas. Categorias, formas e perfil são mantidos.',
              })
            }
            className={btnDanger}
          >
            Apagar tudo
          </button>
        </div>
      </section>

      <StatusSync carregando={carregando} erro={erro} sincronizadoEm={sincronizadoEm} />

      {perigo && (
        <Modal titulo={perigo.titulo} onFechar={() => { setPerigo(null); setConfirmacao(''); }}>
          <p className="text-sm text-slate-600">{perigo.detalhe}</p>
          <label className="mt-4 block text-sm font-medium text-slate-600">
            Digite <strong>APAGAR</strong> para confirmar
            <input
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder="APAGAR"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
            />
          </label>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={executarPerigo}
              disabled={trabalhando || confirmacao.trim().toUpperCase() !== 'APAGAR'}
              className={btnDanger}
            >
              {trabalhando ? 'Apagando…' : 'Confirmar exclusão'}
            </button>
            <button
              type="button"
              onClick={() => { setPerigo(null); setConfirmacao(''); }}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
