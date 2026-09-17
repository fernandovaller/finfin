import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type Despesa, type Receita } from '../api';
import { localeIntl } from '../i18n';
import {
  AlertaErro,
  BRL,
  corBadge,
  deslocarMes,
  formatarData,
  IconeGrafico,
  mesAtual,
  MesNav,
  mesLabel,
  Modal,
  StatusSync,
  TituloPagina,
} from '../ui';
import { useCatalogo } from './useCatalogo';

function barra(pct: number, classe: string) {
  return (
    <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-full rounded-full ${classe}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

type Preset = 'mes' | '6m' | '12m' | 'ano' | 'intervalo';

function listaMeses(preset: Preset, mes: string, ano: string, ini: string, fim: string): string[] {
  if (preset === 'mes') {
    const out: string[] = [];
    for (let i = 5; i >= 0; i--) out.push(deslocarMes(mes, -i));
    return out;
  }
  if (preset === '6m' || preset === '12m') {
    const n = preset === '6m' ? 6 : 12;
    const out: string[] = [];
    for (let i = n - 1; i >= 0; i--) out.push(deslocarMes(mes, -i));
    return out;
  }
  if (preset === 'ano') {
    const a = ano || mes.slice(0, 4);
    return Array.from({ length: 12 }, (_, i) => `${a}-${String(i + 1).padStart(2, '0')}`);
  }
  if (!ini || !fim) return [mes];
  const [a, b] = ini <= fim ? [ini, fim] : [fim, ini];
  const out: string[] = [];
  let cur = a;
  let guard = 0;
  while (cur <= b && guard < 36) {
    out.push(cur);
    cur = deslocarMes(cur, 1);
    guard++;
  }
  return out.length ? out : [mes];
}

function toggle(arr: string[], v: string): string[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function parseValorBR(s: string): number | null {
  if (s.trim() === '') return null;
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export default function Relatorios() {
  const { t } = useTranslation();
  const [mes, setMes] = useState(mesAtual);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);
  const { corDe, contas, contaPorId, nomesPorTipo, formas } = useCatalogo();

  const [preset, setPreset] = useState<Preset>('mes');
  const [ano, setAno] = useState(() => mesAtual().slice(0, 4));
  const [ini, setIni] = useState(() => deslocarMes(mesAtual(), -2));
  const [fim, setFim] = useState(() => mesAtual());
  const [contaFiltro, setContaFiltro] = useState<number | ''>('');
  const [catRec, setCatRec] = useState<string[]>([]);
  const [catDes, setCatDes] = useState<string[]>([]);
  const [formaSel, setFormaSel] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [modalFiltros, setModalFiltros] = useState(false);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    Promise.all([api<Receita[]>('/api/receitas'), api<Despesa[]>('/api/despesas')])
      .then(([r, d]) => {
        if (!ativo) return;
        setReceitas(r);
        setDespesas(d);
        setErro('');
        setSincronizadoEm(new Date());
      })
      .catch((e) => ativo && setErro(e instanceof Error ? e.message : t('comum.falhaCarregar')))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  const meses = useMemo(() => listaMeses(preset, mes, ano, ini, fim), [preset, mes, ano, ini, fim]);
  const noPeriodo = useMemo(() => new Set(meses), [meses]);

  const minNum = parseValorBR(min);
  const maxNum = parseValorBR(max);
  const buscaN = busca.trim().toLowerCase();

  function baseOk(
    contaId: number | null,
    categoria: string,
    forma: string,
    valor: number,
    texto: string,
    cats: string[],
  ): boolean {
    if (contaFiltro !== '' && contaId !== contaFiltro) return false;
    if (cats.length > 0 && !cats.includes(categoria)) return false;
    if (formaSel.length > 0 && !formaSel.includes(forma || '')) return false;
    if (minNum != null && !(valor >= minNum)) return false;
    if (maxNum != null && !(valor <= maxNum)) return false;
    if (buscaN && !texto.toLowerCase().includes(buscaN)) return false;
    return true;
  }

  const recFil = useMemo(
    () =>
      receitas.filter(
        (r) =>
          noPeriodo.has(r.data.slice(0, 7)) &&
          baseOk(r.contaId, r.categoria, r.formaPagamento ?? '', r.valor, `${r.origem} ${r.categoria} ${r.formaPagamento ?? ''} ${r.nota ?? ''}`, catRec),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [receitas, noPeriodo, contaFiltro, catRec, formaSel, minNum, maxNum, buscaN],
  );
  const desFil = useMemo(
    () =>
      despesas.filter(
        (d) =>
          noPeriodo.has(d.data.slice(0, 7)) &&
          baseOk(d.contaId, d.categoria, d.formaPagamento ?? '', d.valor, `${d.descricao} ${d.categoria} ${d.formaPagamento ?? ''} ${d.nota ?? ''}`, catDes),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [despesas, noPeriodo, contaFiltro, catDes, formaSel, minNum, maxNum, buscaN],
  );

  const totalRec = recFil.reduce((s, r) => s + r.valor, 0);
  const totalDes = desFil.reduce((s, d) => s + d.valor, 0);
  const ticketRec = recFil.length ? totalRec / recFil.length : 0;
  const ticketDes = desFil.length ? totalDes / desFil.length : 0;

  const porCatDes = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const d of desFil) mapa.set(d.categoria, (mapa.get(d.categoria) ?? 0) + d.valor);
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [desFil]);

  const porCatRec = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of recFil) mapa.set(r.categoria, (mapa.get(r.categoria) ?? 0) + r.valor);
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [recFil]);

  const porForma = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number }>();
    for (const d of desFil) {
      const nome = d.formaPagamento || t('relatorios.naoInformada');
      const atual = mapa.get(nome) ?? { total: 0, qtd: 0 };
      mapa.set(nome, { total: atual.total + d.valor, qtd: atual.qtd + 1 });
    }
    return [...mapa.entries()].sort((a, b) => b[1].total - a[1].total);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desFil]);

  const topDes = useMemo(() => [...desFil].sort((a, b) => b.valor - a.valor).slice(0, 5), [desFil]);
  const topRec = useMemo(() => [...recFil].sort((a, b) => b.valor - a.valor).slice(0, 5), [recFil]);

  const evolucao = useMemo(() => {
    let acum = 0;
    return meses.map((m) => {
      const rec = recFil.filter((r) => r.data.startsWith(m)).reduce((s, r) => s + r.valor, 0);
      const des = desFil.filter((d) => d.data.startsWith(m)).reduce((s, d) => s + d.valor, 0);
      acum += rec - des;
      return { mes: m, rec, des, saldo: rec - des, acum };
    });
  }, [meses, recFil, desFil]);

  const porConta = useMemo(() => {
    const mapa = new Map<string, { rec: number; des: number }>();
    for (const r of recFil) {
      const nome = contaPorId(r.contaId) || t('relatorios.semConta');
      const atual = mapa.get(nome) ?? { rec: 0, des: 0 };
      mapa.set(nome, { ...atual, rec: atual.rec + r.valor });
    }
    for (const d of desFil) {
      const nome = contaPorId(d.contaId) || t('relatorios.semConta');
      const atual = mapa.get(nome) ?? { rec: 0, des: 0 };
      mapa.set(nome, { ...atual, des: atual.des + d.valor });
    }
    return [...mapa.entries()].sort((a, b) => b[1].rec - b[1].des - (a[1].rec - a[1].des));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recFil, desFil, contaPorId]);

  const filtrosAtivos =
    (preset !== 'mes' ? 1 : 0) +
    (contaFiltro === '' ? 0 : 1) +
    catRec.length +
    catDes.length +
    formaSel.length +
    (buscaN ? 1 : 0) +
    (min !== '' ? 1 : 0) +
    (max !== '' ? 1 : 0);

  function limpar() {
    setPreset('mes');
    setContaFiltro('');
    setCatRec([]);
    setCatDes([]);
    setFormaSel([]);
    setBusca('');
    setMin('');
    setMax('');
  }

  function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function resumoFiltros(): string {
    const partes: string[] = [t('relatorios.fPeriodo', { v: periodoLabel })];
    partes.push(t('relatorios.fConta', { v: contaFiltro === '' ? t('relatorios.fTodas') : esc(contaPorId(contaFiltro) || String(contaFiltro)) }));
    if (catRec.length) partes.push(t('relatorios.fCatRec', { v: catRec.map(esc).join(', ') }));
    if (catDes.length) partes.push(t('relatorios.fCatDes', { v: catDes.map(esc).join(', ') }));
    if (formaSel.length) partes.push(t('relatorios.fFormas', { v: formaSel.map((f) => (f === '' ? t('relatorios.naoInformada') : esc(f))).join(', ') }));
    if (buscaN) partes.push(t('relatorios.fBusca', { v: esc(busca.trim()) }));
    if (minNum != null) partes.push(t('relatorios.fMin', { v: esc(BRL.format(minNum)) }));
    if (maxNum != null) partes.push(t('relatorios.fMax', { v: esc(BRL.format(maxNum)) }));
    return partes.join(' · ');
  }

  function exportarPDF() {
    const linhas = (rows: string[]) => rows.join('');
    const decSep = localeIntl() === 'en-US' ? '.' : ',';
    const pct = (v: number, total: number) => (total ? ((v / total) * 100).toFixed(1).replace('.', decSep) : `0${decSep}0`);
    const html = `<!doctype html><html lang="${localeIntl()}"><head><meta charset="utf-8"><title>${esc(t('relatorios.pdfTitulo', { periodo: periodoLabel }))}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:32px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.04em;color:#334155}
.meta{font-size:12px;color:#475569;margin-bottom:12px}
.cards{display:flex;gap:12px;margin:12px 0 4px}.card{flex:1;border:1px solid #e2e8f0;border-radius:12px;padding:12px}.card p{margin:0;font-size:12px;color:#64748b}.card strong{font-size:18px}
table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;font-size:11px;text-transform:uppercase;color:#64748b;border-bottom:1px solid #e2e8f0;padding:6px}td{border-bottom:1px solid #f1f5f9;padding:6px}.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
@media print{.no-print{display:none}}
</style></head><body>
<h1>${esc(t('relatorios.pdfH1'))}</h1>
<p class="meta">${resumoFiltros()} · ${esc(t('relatorios.pdfGeradoEm', { data: new Date().toLocaleString(localeIntl()) }))}</p>
<div class="cards">
<div class="card"><p>${esc(t('relatorios.receitasLabel'))} (${recFil.length})</p><strong>${esc(BRL.format(totalRec))}</strong><p>${esc(t('relatorios.pdfTicket', { valor: BRL.format(ticketRec) }))}</p></div>
<div class="card"><p>${esc(t('relatorios.despesasLabel'))} (${desFil.length})</p><strong>${esc(BRL.format(totalDes))}</strong><p>${esc(t('relatorios.pdfTicket', { valor: BRL.format(ticketDes) }))}</p></div>
<div class="card"><p>${esc(t('relatorios.thSaldo'))}</p><strong>${esc(BRL.format(totalRec - totalDes))}</strong><p>${esc(t('relatorios.pdfLancamentos', { n: recFil.length + desFil.length }))}</p></div>
</div>
<h2>${esc(t('relatorios.pdfHDesCat'))}</h2>
<table><thead><tr><th>${esc(t('relatorios.pdfThCategoria'))}</th><th class="num">${esc(t('relatorios.pdfThTotal'))}</th><th class="num">%</th></tr></thead><tbody>
${linhas(porCatDes.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="num">${esc(BRL.format(v))}</td><td class="num">${pct(v, totalDes)}%</td></tr>`)) || `<tr><td colspan="3">${esc(t('relatorios.pdfSemDes'))}</td></tr>`}
</tbody></table>
<h2>${esc(t('relatorios.pdfHRecCat'))}</h2>
<table><thead><tr><th>${esc(t('relatorios.pdfThCategoria'))}</th><th class="num">${esc(t('relatorios.pdfThTotal'))}</th><th class="num">%</th></tr></thead><tbody>
${linhas(porCatRec.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="num">${esc(BRL.format(v))}</td><td class="num">${pct(v, totalRec)}%</td></tr>`)) || `<tr><td colspan="3">${esc(t('relatorios.pdfSemRec'))}</td></tr>`}
</tbody></table>
<h2>${esc(t('relatorios.pdfHForma'))}</h2>
<table><thead><tr><th>${esc(t('relatorios.pdfThForma'))}</th><th class="num">${esc(t('relatorios.pdfThQtd'))}</th><th class="num">${esc(t('relatorios.pdfThTotal'))}</th></tr></thead><tbody>
${linhas(porForma.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="num">×${v.qtd}</td><td class="num">${esc(BRL.format(v.total))}</td></tr>`)) || `<tr><td colspan="3">${esc(t('relatorios.pdfSemDes'))}</td></tr>`}
</tbody></table>
<h2>${esc(t('relatorios.pdfHConta'))}</h2>
<table><thead><tr><th>${esc(t('relatorios.pdfThConta'))}</th><th class="num">${esc(t('relatorios.pdfThReceitas'))}</th><th class="num">${esc(t('relatorios.pdfThDespesas'))}</th><th class="num">${esc(t('relatorios.pdfThSaldo'))}</th></tr></thead><tbody>
${linhas(porConta.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="num">${esc(BRL.format(v.rec))}</td><td class="num">${esc(BRL.format(v.des))}</td><td class="num">${esc(BRL.format(v.rec - v.des))}</td></tr>`)) || `<tr><td colspan="4">${esc(t('relatorios.pdfSemMov'))}</td></tr>`}
</tbody></table>
<h2>${esc(t('relatorios.pdfHTopDes'))}</h2>
<table><thead><tr><th>${esc(t('relatorios.pdfThDescricao'))}</th><th>${esc(t('relatorios.pdfThData'))}</th><th>${esc(t('relatorios.pdfThCategoria'))}</th><th class="num">${esc(t('relatorios.pdfThValor'))}</th></tr></thead><tbody>
${linhas(topDes.map((d) => `<tr><td>${esc(d.descricao || d.categoria)}</td><td>${esc(d.data.split('-').reverse().join('/'))}</td><td>${esc(d.categoria)}</td><td class="num">${esc(BRL.format(d.valor))}</td></tr>`)) || '<tr><td colspan="4">—</td></tr>'}
</tbody></table>
<h2>${esc(t('relatorios.pdfHTopRec'))}</h2>
<table><thead><tr><th>${esc(t('relatorios.pdfThOrigem'))}</th><th>${esc(t('relatorios.pdfThData'))}</th><th>${esc(t('relatorios.pdfThCategoria'))}</th><th class="num">${esc(t('relatorios.pdfThValor'))}</th></tr></thead><tbody>
${linhas(topRec.map((r) => `<tr><td>${esc(r.origem)}</td><td>${esc(r.data.split('-').reverse().join('/'))}</td><td>${esc(r.categoria)}</td><td class="num">${esc(BRL.format(r.valor))}</td></tr>`)) || '<tr><td colspan="4">—</td></tr>'}
</tbody></table>
<h2>${esc(t('relatorios.pdfHEvo'))}</h2>
<table><thead><tr><th>${esc(t('relatorios.pdfThMes'))}</th><th class="num">${esc(t('relatorios.pdfThReceitas'))}</th><th class="num">${esc(t('relatorios.pdfThDespesas'))}</th><th class="num">${esc(t('relatorios.pdfThSaldo'))}</th><th class="num">${esc(t('relatorios.pdfThAcum'))}</th></tr></thead><tbody>
${linhas(evolucao.map((e) => `<tr><td>${esc(mesLabel(e.mes))}</td><td class="num">${esc(BRL.format(e.rec))}</td><td class="num">${esc(BRL.format(e.des))}</td><td class="num">${esc(BRL.format(e.saldo))}</td><td class="num">${esc(BRL.format(e.acum))}</td></tr>`))}
</tbody></table>
<p class="meta no-print" style="margin-top:24px">${esc(t('relatorios.pdfDica'))} <button onclick="window.print()">${esc(t('relatorios.pdfBtn'))}</button></p>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) {
      setErro(t('relatorios.erroPopup'));
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
  }

  const catsRec = nomesPorTipo('receita');
  const catsDes = nomesPorTipo('despesa');

  const chip = (ativo: boolean) =>
    `rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition ${
      ativo
        ? 'bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-100'
        : 'bg-white dark:bg-slate-900 text-slate-500 ring-slate-200 dark:ring-slate-700 hover:ring-slate-400'
    }`;

  const inputCls =
    'rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm outline-none';

  const periodoLabel =
    preset === 'mes'
      ? mesLabel(mes)
      : preset === 'ano'
        ? ano
        : `${meses.length} meses · ${meses[0] ? mesLabel(meses[0]) : ''} → ${meses[meses.length - 1] ? mesLabel(meses[meses.length - 1]) : ''}`;

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-2">
        <TituloPagina Icon={IconeGrafico}>{t('relatorios.titulo')}</TituloPagina>
        <span className="flex-1" />
        <MesNav mes={mes} onChange={setMes} />
        <button
          type="button"
          onClick={() => setModalFiltros(true)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          {filtrosAtivos > 0 ? t('relatorios.filtrosCount', { n: filtrosAtivos }) : t('relatorios.filtros')}
        </button>
        <button
          type="button"
          onClick={exportarPDF}
          disabled={carregando}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {t('relatorios.exportarPdf')}
        </button>
      </div>

      <p className="text-sm text-slate-400 dark:text-slate-500">
        {periodoLabel}
        {filtrosAtivos > 0 ? t('relatorios.comFiltros', { count: filtrosAtivos, n: filtrosAtivos }) : t('relatorios.semFiltros')}
      </p>

      <AlertaErro mensagem={erro} />

      {modalFiltros && (
        <Modal titulo={t('relatorios.modalTitulo')} onFechar={() => setModalFiltros(false)} wide>
          <div className="space-y-4">

        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('relatorios.periodo')}
            <select value={preset} onChange={(e) => setPreset(e.target.value as Preset)} className={`mt-1 w-full ${inputCls}`}>
              <option value="mes">{t('relatorios.presetMes')}</option>
              <option value="6m">{t('relatorios.preset6m')}</option>
              <option value="12m">{t('relatorios.preset12m')}</option>
              <option value="ano">{t('relatorios.presetAno')}</option>
              <option value="intervalo">{t('relatorios.presetIntervalo')}</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('relatorios.conta')}
            <select
              value={contaFiltro}
              onChange={(e) => setContaFiltro(e.target.value === '' ? '' : Number(e.target.value))}
              className={`mt-1 w-full ${inputCls}`}
            >
              <option value="">{t('relatorios.todas')}</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icone ? `${c.icone} ` : ''}{c.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        {preset === 'ano' ? (
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('relatorios.ano')}
            <input value={ano} onChange={(e) => setAno(e.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" placeholder="2026" className={`mt-1 w-full ${inputCls}`} />
          </label>
        ) : preset === 'intervalo' ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('relatorios.inicio')}
              <input type="month" value={ini} onChange={(e) => setIni(e.target.value)} className={`mt-1 w-full ${inputCls} [color-scheme:light] dark:[color-scheme:dark]`} />
            </label>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400">
              {t('relatorios.fim')}
              <input type="month" value={fim} onChange={(e) => setFim(e.target.value)} className={`mt-1 w-full ${inputCls} [color-scheme:light] dark:[color-scheme:dark]`} />
            </label>
          </div>
        ) : null}

        <div className="grid grid-cols-8 gap-3">
          <label className="col-span-4 block text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('relatorios.busca')}
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t('relatorios.buscaPlaceholder')} className={`mt-1 w-full ${inputCls}`} />
          </label>
          <label className="col-span-2 block text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('relatorios.min')}
            <input value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d.,]/g, '').slice(0, 12))} inputMode="decimal" placeholder="0" className={`mt-1 w-full ${inputCls} tabular-nums`} />
          </label>
          <label className="col-span-2 block text-sm font-medium text-slate-600 dark:text-slate-400">
            {t('relatorios.max')}
            <input value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.,]/g, '').slice(0, 12))} inputMode="decimal" placeholder="∞" className={`mt-1 w-full ${inputCls} tabular-nums`} />
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('relatorios.catRec')} {catRec.length > 0 && `(${catRec.length})`}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {catsRec.length === 0 && <span className="text-xs text-slate-400">{t('relatorios.nenhuma')}</span>}
              {catsRec.map((c) => (
                <button key={c} type="button" onClick={() => setCatRec(toggle(catRec, c))} aria-pressed={catRec.includes(c)} className={`${chip(catRec.includes(c))} shrink-0 whitespace-nowrap`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('relatorios.catDes')} {catDes.length > 0 && `(${catDes.length})`}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {catsDes.length === 0 && <span className="text-xs text-slate-400">{t('relatorios.nenhuma')}</span>}
              {catsDes.map((c) => (
                <button key={c} type="button" onClick={() => setCatDes(toggle(catDes, c))} aria-pressed={catDes.includes(c)} className={`${chip(catDes.includes(c))} shrink-0 whitespace-nowrap`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('relatorios.formasPag')} {formaSel.length > 0 && `(${formaSel.length})`}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {formas.length === 0 && <span className="text-xs text-slate-400">{t('relatorios.nenhuma')}</span>}
              {formas.map((f) => (
                <button key={f} type="button" onClick={() => setFormaSel(toggle(formaSel, f))} aria-pressed={formaSel.includes(f)} className={`${chip(formaSel.includes(f))} shrink-0 whitespace-nowrap`}>
                  {f}
                </button>
              ))}
              <button type="button" onClick={() => setFormaSel(toggle(formaSel, ''))} aria-pressed={formaSel.includes('')} className={`${chip(formaSel.includes(''))} shrink-0 whitespace-nowrap`}>
                {t('relatorios.naoInformada')}
              </button>
            </div>
          </div>
        </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              {filtrosAtivos > 0 && (
                <button
                  type="button"
                  onClick={limpar}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {t('relatorios.limpar')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalFiltros(false)}
                className={`${filtrosAtivos > 0 ? '' : 'col-span-2'} rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700`}
              >
                {t('relatorios.aplicar')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('relatorios.recFiltrado')}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {carregando ? '…' : BRL.format(totalRec)}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('relatorios.lancamentosTicket', { n: recFil.length, valor: BRL.format(ticketRec) })}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('relatorios.desFiltrado')}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
            {carregando ? '…' : BRL.format(totalDes)}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('relatorios.lancamentosTicket', { n: desFil.length, valor: BRL.format(ticketDes) })}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('relatorios.saldoFiltrado')}</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${totalRec - totalDes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {carregando ? '…' : BRL.format(totalRec - totalDes)}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t('relatorios.lancamentosPeriodo', { n: recFil.length + desFil.length })}</p>
        </div>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <section aria-label={t('relatorios.desPorCat')} className="flex h-full flex-col rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <h2 className="text-base font-bold">{t('relatorios.desPorCat')}</h2>
          {porCatDes.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">{t('relatorios.semDesFiltro')}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {porCatDes.map(([nome, total]) => (
                <li key={nome} className="flex items-center gap-3">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${corBadge(corDe(nome, 'despesa'))}`}>{nome}</span>
                  <div className="flex-1">{barra(totalDes ? (total / totalDes) * 100 : 0, 'bg-rose-500')}</div>
                  <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums">{BRL.format(total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label={t('relatorios.recPorCat')} className="flex h-full flex-col rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <h2 className="text-base font-bold">{t('relatorios.recPorCat')}</h2>
          {porCatRec.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">{t('relatorios.semRecFiltro')}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {porCatRec.map(([nome, total]) => (
                <li key={nome} className="flex items-center gap-3">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${corBadge(corDe(nome, 'receita'))}`}>{nome}</span>
                  <div className="flex-1">{barra(totalRec ? (total / totalRec) * 100 : 0, 'bg-emerald-500')}</div>
                  <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums">{BRL.format(total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid items-stretch gap-6 lg:grid-cols-2">
        <section aria-label={t('relatorios.porCartao')} className="flex h-full flex-col rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <h2 className="text-base font-bold">{t('relatorios.porCartao')}</h2>
          {porForma.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">{t('relatorios.semDesFiltro')}</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {porForma.map(([nome, { total, qtd }]) => (
                <li key={nome} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm font-medium">{nome}</span>
                  <div className="flex-1">{barra(totalDes ? (total / totalDes) * 100 : 0, 'bg-sky-500')}</div>
                  <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums">{BRL.format(total)}</span>
                  <span className="w-8 shrink-0 text-right text-xs text-slate-400 dark:text-slate-500">×{qtd}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label={t('relatorios.maiores')} className="flex h-full flex-col rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <h2 className="text-base font-bold">{t('relatorios.maiores')}</h2>
          {topDes.length === 0 && topRec.length === 0 ? (
            <p className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">{t('relatorios.semLancFiltro')}</p>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-rose-500">{t('relatorios.despesasLabel')}</p>
                <ul className="mt-2 space-y-2">
                  {topDes.map((d) => (
                    <li key={d.id} className="text-sm">
                      <p className="truncate font-semibold">{d.descricao || d.categoria}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{formatarData(d.data)} · {d.categoria} · <span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">{BRL.format(d.valor)}</span></p>
                    </li>
                  ))}
                  {topDes.length === 0 && <li className="text-xs text-slate-400">—</li>}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-500">{t('relatorios.receitasLabel')}</p>
                <ul className="mt-2 space-y-2">
                  {topRec.map((r) => (
                    <li key={r.id} className="text-sm">
                      <p className="truncate font-semibold">{r.origem}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{formatarData(r.data)} · {r.categoria} · <span className="font-bold tabular-nums text-slate-700 dark:text-slate-200">{BRL.format(r.valor)}</span></p>
                    </li>
                  ))}
                  {topRec.length === 0 && <li className="text-xs text-slate-400">—</li>}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>

      <section aria-label={t('relatorios.porConta')} className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <h2 className="px-5 pt-5 text-base font-bold">{t('relatorios.porConta')}</h2>
        <div className="overflow-x-auto p-5 pt-3">
          {porConta.length === 0 ? (
            <p className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">{t('relatorios.semMovFiltro')}</p>
          ) : (
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  <th className="pb-2 font-semibold">{t('relatorios.thConta')}</th>
                  <th className="pb-2 text-right font-semibold">{t('relatorios.thReceitas')}</th>
                  <th className="pb-2 text-right font-semibold">{t('relatorios.thDespesas')}</th>
                  <th className="pb-2 text-right font-semibold">{t('relatorios.thSaldo')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {porConta.map(([nome, { rec, des }]) => (
                  <tr key={nome}>
                    <td className="py-2 pr-4 font-medium">{nome}</td>
                    <td className="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{BRL.format(rec)}</td>
                    <td className="py-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{BRL.format(des)}</td>
                    <td className="py-2 text-right tabular-nums text-slate-800 dark:text-slate-200">{BRL.format(rec - des)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section aria-label={t('relatorios.evolucao', { periodo: periodoLabel })} className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <h2 className="px-5 pt-5 text-base font-bold">{t('relatorios.evolucao', { periodo: periodoLabel })}</h2>
        <div className="overflow-x-auto p-5 pt-3">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="pb-2 font-semibold">{t('relatorios.thMes')}</th>
                <th className="pb-2 text-right font-semibold">{t('relatorios.thReceitas')}</th>
                <th className="pb-2 text-right font-semibold">{t('relatorios.thDespesas')}</th>
                <th className="pb-2 text-right font-semibold">{t('relatorios.thSaldo')}</th>
                <th className="pb-2 text-right font-semibold">{t('relatorios.thAcumulado')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {evolucao.map(({ mes: m, rec, des, saldo, acum }) => (
                <tr key={m} className={m === mes ? 'bg-emerald-50/60 dark:bg-emerald-950/40 font-semibold' : ''}>
                  <td className="py-2 pr-4 capitalize">{mesLabel(m)}</td>
                  <td className="py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{BRL.format(rec)}</td>
                  <td className="py-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{BRL.format(des)}</td>
                  <td className={`py-2 text-right tabular-nums ${saldo >= 0 ? 'text-slate-800 dark:text-slate-200' : 'font-bold text-rose-600 dark:text-rose-400'}`}>{BRL.format(saldo)}</td>
                  <td className={`py-2 text-right tabular-nums ${acum >= 0 ? 'text-slate-800 dark:text-slate-200' : 'font-bold text-rose-600 dark:text-rose-400'}`}>{BRL.format(acum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <StatusSync carregando={carregando} erro={erro} sincronizadoEm={sincronizadoEm} />
    </main>
  );
}
