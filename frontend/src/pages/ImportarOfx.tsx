import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { parseOfx, type OfxItem } from '../ofx';
import {
  AlertaErro,
  BRL,
  formatarData,
  IconeExtrato,
  StatusSync,
  TituloPagina,
} from '../ui';
import { useCatalogo } from './useCatalogo';

interface Linha {
  item: OfxItem;
  incluir: boolean;
  tipo: 'receita' | 'despesa';
  categoria: string;
}

export default function ImportarOfx() {
  const { nomesPorTipo, formas, contas, contaPrincipal } = useCatalogo();
  const [arquivoNome, setArquivoNome] = useState('');
  const [contaId, setContaId] = useState<number | ''>('');
  const [catRec, setCatRec] = useState('');
  const [catDes, setCatDes] = useState('');
  const [forma, setForma] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [trabalhando, setTrabalhando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);

  const catsRec = nomesPorTipo('receita');
  const catsDes = nomesPorTipo('despesa');

  useEffect(() => {
    if (contas.length > 0 && contaId === '') {
      setContaId(contaPrincipal?.id ?? contas[0].id);
    }
  }, [contas, contaPrincipal, contaId]);
  useEffect(() => {
    if (!catRec && catsRec.length > 0) setCatRec(catsRec[0]);
  }, [catsRec, catRec]);
  useEffect(() => {
    if (!catDes && catsDes.length > 0) setCatDes(catsDes[0]);
  }, [catsDes, catDes]);
  useEffect(() => {
    if (!forma && formas.length > 0) setForma(formas[0]);
  }, [formas, forma]);

  async function onArquivo(file: File | null) {
    if (!file) return;
    setErro('');
    setOk('');
    try {
      const itens = parseOfx(await file.text());
      setArquivoNome(file.name);
      setLinhas(
        itens.map((item) => ({
          item,
          incluir: true,
          tipo: item.tipo,
          categoria: item.tipo === 'receita' ? catRec || catsRec[0] || '' : catDes || catsDes[0] || '',
        })),
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao ler arquivo');
      setLinhas([]);
      setArquivoNome('');
    }
  }

  const resumo = useMemo(() => {
    const sel = linhas.filter((l) => l.incluir);
    return {
      total: sel.length,
      receitas: sel.filter((l) => l.tipo === 'receita'),
      despesas: sel.filter((l) => l.tipo === 'despesa'),
      valorRec: sel.filter((l) => l.tipo === 'receita').reduce((s, l) => s + l.item.valor, 0),
      valorDes: sel.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + l.item.valor, 0),
    };
  }, [linhas]);

  function alternarTipo(i: number) {
    setLinhas((ls) =>
      ls.map((l, j) => {
        if (j !== i) return l;
        const tipo = l.tipo === 'receita' ? 'despesa' : 'receita';
        return { ...l, tipo, categoria: tipo === 'receita' ? catRec : catDes };
      }),
    );
  }

  async function confirmar() {
    if (contaId === '') {
      setErro('Escolha a conta de destino');
      return;
    }
    const itens = linhas
      .filter((l) => l.incluir)
      .map((l) => ({
        fitid: l.item.fitid,
        data: l.item.data,
        valor: l.item.valor,
        tipo: l.tipo,
        categoria: l.categoria,
        descricao: l.item.descricao,
      }));
    if (itens.length === 0) {
      setErro('Marque ao menos um lançamento para importar');
      return;
    }
    setTrabalhando(true);
    try {
      setErro('');
      setOk('');
      const r = await api<{ receitas: number; despesas: number; ignorados: number }>(
        '/api/importar/ofx',
        {
          method: 'POST',
          body: JSON.stringify({
            contaId,
            categoriaReceita: catRec,
            categoriaDespesa: catDes,
            formaPagamento: forma,
            itens,
          }),
        },
      );
      setOk(
        `Importados ${r.receitas} receita(s) e ${r.despesas} despesa(s)` +
          (r.ignorados > 0 ? ` — ${r.ignorados} duplicado(s) ignorado(s).` : '.'),
      );
      setLinhas([]);
      setArquivoNome('');
      setSincronizadoEm(new Date());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao importar');
    } finally {
      setTrabalhando(false);
    }
  }

  const card =
    'rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800';
  const select =
    'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm outline-none';
  const todasMarcadas = linhas.length > 0 && linhas.every((l) => l.incluir);

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TituloPagina Icon={IconeExtrato}>Importar OFX</TituloPagina>
        <Link
          to="/lancamentos"
          className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          ← Voltar a Lançamentos
        </Link>
      </div>

      <AlertaErro mensagem={erro} />
      {ok && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-900"
        >
          {ok}{' '}
          <Link to="/lancamentos" className="font-bold hover:underline">
            Ver lançamentos
          </Link>
        </p>
      )}

      <section aria-label="Arquivo e destino" className={card}>
        <h2 className="text-base font-bold">
          <span className="mr-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">1</span>
          Arquivo e destino
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Exporte o extrato no app do banco (formato OFX) e escolha para onde vão os lançamentos.
          O tipo vem do sinal do valor; a categoria padrão pode ser ajustada por linha na prévia.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 sm:col-span-2">
            Arquivo .ofx
            <input
              type="file"
              accept=".ofx,.ofc"
              onChange={(e) => void onArquivo(e.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
            />
          </label>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            Conta de destino
            <select value={contaId} onChange={(e) => setContaId(e.target.value === '' ? '' : Number(e.target.value))} className={`${select} mt-1`}>
              <option value="">Escolher…</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icone ? `${c.icone} ` : ''}{c.nome}{c.principal ? ' (principal)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            Forma de pagamento
            <select value={forma} onChange={(e) => setForma(e.target.value)} className={`${select} mt-1`}>
              <option value="">Não informar</option>
              {formas.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            Categoria padrão · receitas
            <select value={catRec} onChange={(e) => setCatRec(e.target.value)} className={`${select} mt-1`}>
              {catsRec.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            Categoria padrão · despesas
            <select value={catDes} onChange={(e) => setCatDes(e.target.value)} className={`${select} mt-1`}>
              {catsDes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {linhas.length > 0 && (
        <section aria-label="Prévia da importação" className={card}>
          <h2 className="text-base font-bold">
            <span className="mr-2 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">2</span>
            Prévia · {arquivoNome}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {resumo.total} selecionado(s) —{' '}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {resumo.receitas.length} receita(s) {BRL.format(resumo.valorRec)}
            </span>{' '}
            ·{' '}
            <span className="font-bold text-rose-600 dark:text-rose-400">
              {resumo.despesas.length} despesa(s) {BRL.format(resumo.valorDes)}
            </span>
            . Clique no tipo para trocar; duplicados de importação anterior são ignorados sozinhos.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="pb-2 pr-2">
                    <input
                      type="checkbox"
                      checked={todasMarcadas}
                      onChange={(e) =>
                        setLinhas((ls) => ls.map((l) => ({ ...l, incluir: e.target.checked })))
                      }
                      aria-label="Selecionar todos"
                      className="h-4 w-4 accent-emerald-600"
                    />
                  </th>
                  <th className="pb-2 pr-4 font-semibold">Data</th>
                  <th className="pb-2 pr-4 font-semibold">Descrição</th>
                  <th className="pb-2 pr-4 font-semibold">Tipo</th>
                  <th className="pb-2 pr-4 font-semibold">Categoria</th>
                  <th className="pb-2 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {linhas.map((l, i) => (
                  <tr key={l.item.fitid ?? `${l.item.data}-${l.item.valor}-${i}`} className={l.incluir ? '' : 'opacity-40'}>
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={l.incluir}
                        onChange={(e) =>
                          setLinhas((ls) => ls.map((x, j) => (j === i ? { ...x, incluir: e.target.checked } : x)))
                        }
                        aria-label={`Incluir ${l.item.descricao}`}
                        className="h-4 w-4 accent-emerald-600"
                      />
                    </td>
                    <td className="py-2 pr-4 tabular-nums">{formatarData(l.item.data)}</td>
                    <td className="max-w-[280px] truncate py-2 pr-4 font-medium" title={l.item.descricao}>
                      {l.item.descricao}
                    </td>
                    <td className="py-2 pr-4">
                      <button
                        type="button"
                        onClick={() => alternarTipo(i)}
                        title="Clique para trocar o tipo"
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset transition ${
                          l.tipo === 'receita'
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-900'
                            : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 ring-rose-200 dark:ring-rose-900'
                        }`}
                      >
                        {l.tipo === 'receita' ? '+ Receita' : '− Despesa'}
                      </button>
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        value={l.categoria}
                        onChange={(e) =>
                          setLinhas((ls) => ls.map((x, j) => (j === i ? { ...x, categoria: e.target.value } : x)))
                        }
                        aria-label={`Categoria de ${l.item.descricao}`}
                        className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs outline-none"
                      >
                        {(l.tipo === 'receita' ? catsRec : catsDes).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className={`py-2 text-right font-bold tabular-nums ${l.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {BRL.format(l.item.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={confirmar}
            disabled={trabalhando || resumo.total === 0}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
          >
            {trabalhando ? 'Importando…' : `Confirmar importação (${resumo.total})`}
          </button>
        </section>
      )}

      <StatusSync carregando={false} erro="" sincronizadoEm={sincronizadoEm} />
    </main>
  );
}
