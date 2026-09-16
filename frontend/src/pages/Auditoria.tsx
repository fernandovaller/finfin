import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { AlertaErro, IconeExtrato, Modal, StatusSync, TituloPagina } from '../ui';

export interface RegistroAuditoria {
  id: number;
  modulo: string;
  acao: string;
  registroId: number | null;
  descricao: string;
  detalhes: string | null;
  criadoEm: string;
}

export interface PaginaAuditoria {
  itens: RegistroAuditoria[];
  total: number;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
}

const MODULOS = ['', 'receitas', 'despesas', 'contas', 'categorias', 'formas-pagamento', 'auth', 'importacao', 'dados'];
const ACOES = ['', 'criar', 'atualizar', 'excluir', 'login', 'logout', 'importar', 'exportar', 'apagar', 'restaurar'];

const POR_PAGINA = 20;

function corAcao(acao: string): string {
  switch (acao) {
    case 'criar':
    case 'importar':
    case 'restaurar':
      return 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900';
    case 'atualizar':
      return 'bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-900';
    case 'excluir':
    case 'apagar':
      return 'bg-red-100 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900';
    default:
      return 'bg-slate-200 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700';
  }
}

function formataDataHora(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function Auditoria() {
  const [modulo, setModulo] = useState('');
  const [acao, setAcao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [busca, setBusca] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState<PaginaAuditoria | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);
  const [detalhe, setDetalhe] = useState<RegistroAuditoria | null>(null);
  const [limpando, setLimpando] = useState(false);
  const [confirmaLimpar, setConfirmaLimpar] = useState(false);
  const [restaurarAlvo, setRestaurarAlvo] = useState<RegistroAuditoria | null>(null);
  const [restaurando, setRestaurando] = useState(false);
  const [ok, setOk] = useState('');

  const RESTAURAVEIS = ['receitas', 'despesas', 'contas', 'categorias', 'formas-pagamento'];

  function podeRestaurar(r: RegistroAuditoria): boolean {
    return r.acao === 'excluir' && RESTAURAVEIS.includes(r.modulo) && !!r.detalhes;
  }

  const carregar = useCallback(async (pag: number) => {
    try {
      setCarregando(true);
      setErro('');
      const q = new URLSearchParams();
      if (modulo) q.set('modulo', modulo);
      if (acao) q.set('acao', acao);
      if (busca.trim()) q.set('descricao', busca.trim());
      if (dataInicio) q.set('dataInicio', dataInicio);
      if (dataFim) q.set('dataFim', dataFim);
      q.set('pagina', String(pag));
      q.set('porPagina', String(POR_PAGINA));
      const r = await api<PaginaAuditoria>(`/api/auditoria?${q.toString()}`);
      setDados(r);
      setPagina(r.pagina);
      setSincronizadoEm(new Date());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar auditoria');
    } finally {
      setCarregando(false);
    }
  }, [modulo, acao, busca, dataInicio, dataFim]);

  useEffect(() => {
    void carregar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pesquisar() {
    void carregar(1);
  }

  function limparFiltros() {
    setModulo('');
    setAcao('');
    setDescricao('');
    setBusca('');
    setDataInicio('');
    setDataFim('');
  }

  useEffect(() => {
    setBusca(descricao);
  }, [descricao]);

  async function limparHistorico() {
    setLimpando(true);
    try {
      setErro('');
      setOk('');
      await api<{ excluidas: number }>('/api/auditoria', { method: 'DELETE' });
      setConfirmaLimpar(false);
      await carregar(1);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao limpar histórico');
    } finally {
      setLimpando(false);
    }
  }

  async function restaurar() {
    if (!restaurarAlvo) return;
    setRestaurando(true);
    try {
      setErro('');
      setOk('');
      await api(`/api/auditoria/${restaurarAlvo.id}/restaurar`, { method: 'POST' });
      setRestaurarAlvo(null);
      setOk(`"${restaurarAlvo.descricao}" restaurado com novo id.`);
      await carregar(dados?.pagina ?? 1);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao restaurar');
    } finally {
      setRestaurando(false);
    }
  }

  const input =
    'rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200';
  const btn =
    'rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 disabled:opacity-60';

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TituloPagina Icon={IconeExtrato}>Auditoria</TituloPagina>
        <button type="button" onClick={() => setConfirmaLimpar(true)} className={btn}>
          Limpar histórico
        </button>
      </div>
      <AlertaErro mensagem={erro} />
      {ok && (
        <p role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-900">
          {ok}
        </p>
      )}

      <section className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            Módulo
            <select value={modulo} onChange={(e) => setModulo(e.target.value)} className={`mt-1 w-full ${input}`}>
              {MODULOS.map((m) => (
                <option key={m} value={m}>{m === '' ? 'Todos' : m}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            Ação
            <select value={acao} onChange={(e) => setAcao(e.target.value)} className={`mt-1 w-full ${input}`}>
              {ACOES.map((a) => (
                <option key={a} value={a}>{a === '' ? 'Todas' : a}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            Descrição
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && pesquisar()}
              placeholder="Ex.: Mercado, Conta Principal…"
              className={`mt-1 w-full ${input}`}
            />
          </label>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            De
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className={`mt-1 w-full ${input}`} />
          </label>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            Até
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className={`mt-1 w-full ${input}`} />
          </label>
          <div className="flex items-end gap-2">
            <button type="button" onClick={pesquisar} disabled={carregando} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-slate-700 disabled:opacity-60">
              {carregando ? 'Buscando…' : 'Pesquisar'}
            </button>
            <button type="button" onClick={limparFiltros} className={btn}>
              Limpar
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        {carregando && !dados ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Carregando…</p>
        ) : !dados || dados.itens.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Nenhum evento encontrado para os filtros.</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {dados.itens.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                  <span className="w-24 shrink-0 text-xs tabular-nums text-slate-400">{formataDataHora(r.criadoEm)}</span>
                  <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
                    {r.modulo}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset ${corAcao(r.acao)}`}>
                    {r.acao}
                  </span>
                  <span className="min-w-0 flex-1 basis-48 truncate text-sm">{r.descricao || '—'}</span>
                  {r.detalhes && (
                    <button type="button" onClick={() => setDetalhe(r)} className="rounded-lg px-2 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/50">
                      Ver detalhe
                    </button>
                  )}
                  {podeRestaurar(r) && (
                    <button type="button" onClick={() => setRestaurarAlvo(r)} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white transition hover:bg-emerald-700">
                      Restaurar
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 px-5 py-3 text-sm">
              <p className="text-xs text-slate-400">
                {dados.total} evento(s) · página {dados.pagina} de {dados.totalPaginas}
              </p>
              <div className="flex gap-2">
                <button type="button" disabled={dados.pagina <= 1} onClick={() => carregar(dados.pagina - 1)} className={btn}>
                  ‹ Anterior
                </button>
                <button type="button" disabled={dados.pagina >= dados.totalPaginas} onClick={() => carregar(dados.pagina + 1)} className={btn}>
                  Próxima ›
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <StatusSync carregando={carregando} erro={erro} sincronizadoEm={sincronizadoEm} />

      {detalhe && (
        <Modal titulo={`Evento #${detalhe.id} · ${detalhe.modulo}/${detalhe.acao}`} onFechar={() => setDetalhe(null)} wide>
          <p className="text-sm text-slate-600 dark:text-slate-400">{detalhe.descricao}</p>
          <p className="mt-1 text-xs text-slate-400">{formataDataHora(detalhe.criadoEm)}</p>
          <pre className="mt-3 max-h-80 overflow-auto rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-xs">
            {JSON.stringify(JSON.parse(detalhe.detalhes ?? '{}'), null, 2)}
          </pre>
          <button type="button" onClick={() => setDetalhe(null)} className={`mt-4 w-full ${btn}`}>
            Fechar
          </button>
        </Modal>
      )}

      {confirmaLimpar && (
        <Modal titulo="Limpar histórico?" onFechar={() => setConfirmaLimpar(false)}>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Todo o histórico de auditoria será apagado. Essa ação não pode ser desfeita.
          </p>
          <div className="mt-4 grid gap-2">
            <button type="button" onClick={limparHistorico} disabled={limpando} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60">
              {limpando ? 'Apagando…' : 'Confirmar'}
            </button>
            <button type="button" onClick={() => setConfirmaLimpar(false)} className={btn}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}

      {restaurarAlvo && (
        <Modal titulo="Restaurar registro?" onFechar={() => setRestaurarAlvo(null)}>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            <strong>“{restaurarAlvo.descricao}”</strong> será recriado com um novo id
            (o id original não volta). Lançamentos só voltam se a conta ainda existir;
            contas voltam sem vínculo com lançamentos.
          </p>
          <div className="mt-4 grid gap-2">
            <button type="button" onClick={restaurar} disabled={restaurando} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {restaurando ? 'Restaurando…' : 'Confirmar restauração'}
            </button>
            <button type="button" onClick={() => setRestaurarAlvo(null)} className={btn}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
