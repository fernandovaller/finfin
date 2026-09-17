import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { salvarIdioma, type Idioma } from '../i18n';
import { useAparencia, type Largura, type Tema } from '../tema';
import { AlertaErro, IconeEngrenagem, Modal, StatusSync, TituloPagina } from '../ui';

interface Contagem {
  contas: number;
  receitas: number;
  despesas: number;
  categorias: number;
  formasPagamento: number;
}

interface StatusIntegracoes {
  email: {
    configurado: boolean;
    origem: 'conta' | 'ambiente' | null;
    mascarada: string | null;
  };
}

interface StatusDemo {
  existe: boolean;
  contas: number;
  receitas: number;
  despesas: number;
}

type Aba = 'geral' | 'backup' | 'email' | 'perigo';

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
  const { t, i18n } = useTranslation();
  const [contagem, setContagem] = useState<Contagem | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [trabalhando, setTrabalhando] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');
  const [sincronizadoEm, setSincronizadoEm] = useState<Date | null>(null);
  const [perigo, setPerigo] = useState<Perigo>(null);
  const [confirmacao, setConfirmacao] = useState('');
  const [aba, setAba] = useState<Aba>('geral');
  const [integracao, setIntegracao] = useState<StatusIntegracoes | null>(null);
  const [demo, setDemo] = useState<StatusDemo | null>(null);
  const [confirmarDemo, setConfirmarDemo] = useState(false);
  const [chave, setChave] = useState('');
  const [mostrarChave, setMostrarChave] = useState(false);
  const [salvandoEmail, setSalvandoEmail] = useState(false);

  async function recarregar() {
    try {
      setErro('');
      const [contagemAtual, integracaoAtual, demoAtual] = await Promise.all([
        api<Contagem>('/api/contagem'),
        api<StatusIntegracoes>('/api/auth/integracoes'),
        api<StatusDemo>('/api/dados/demonstracao'),
      ]);
      setContagem(contagemAtual);
      setIntegracao(integracaoAtual);
      setDemo(demoAtual);
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
      setOk(t('config.exportar.okJson'));
    } catch (e) {
      setErro(e instanceof Error ? e.message : t('config.exportar.erro'));
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
      setOk(t('config.exportar.okCsv', { tipo }));
    } catch (e) {
      setErro(e instanceof Error ? e.message : t('config.exportar.erro'));
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
          ? t('config.catalogo.okNada')
          : t('config.catalogo.ok', { cats: r.categorias, formas: r.formas }),
      );
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : t('config.catalogo.erro'));
    } finally {
      setTrabalhando(false);
    }
  }

  async function gerarDemo() {
    setTrabalhando(true);
    try {
      setErro('');
      setOk('');
      const r = await api<{ contas: number; receitas: number; despesas: number }>(
        '/api/dados/demonstracao',
        { method: 'POST' },
      );
      setOk(
        t('config.demo.okCriada', { contas: r.contas, rec: r.receitas, des: r.despesas }),
      );
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : t('config.demo.erroGerar'));
    } finally {
      setTrabalhando(false);
    }
  }

  async function removerDemo() {
    setTrabalhando(true);
    try {
      setErro('');
      setOk('');
      const r = await api<{ contas: number; receitas: number; despesas: number }>(
        '/api/dados/demonstracao',
        { method: 'DELETE' },
      );
      const total = r.contas + r.receitas + r.despesas;
      setOk(
        total === 0
          ? t('config.demo.okNada')
          : t('config.demo.okRemovida', { rec: r.receitas, des: r.despesas, contas: r.contas }),
      );
      setConfirmarDemo(false);
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : t('config.demo.erroRemover'));
    } finally {
      setTrabalhando(false);
    }
  }

  async function salvarChave() {
    setSalvandoEmail(true);
    try {
      setErro('');
      setOk('');
      const r = await api<StatusIntegracoes>('/api/auth/integracoes', {
        method: 'PUT',
        body: JSON.stringify({ resendApiKey: chave }),
      });
      setIntegracao(r);
      setChave('');
      setMostrarChave(false);
      setOk(t('config.email.okSalva'));
    } catch (e) {
      setErro(e instanceof Error ? e.message : t('config.email.erroSalvar'));
    } finally {
      setSalvandoEmail(false);
    }
  }

  async function removerChave() {
    setSalvandoEmail(true);
    try {
      setErro('');
      setOk('');
      const r = await api<StatusIntegracoes>('/api/auth/integracoes', {
        method: 'PUT',
        body: JSON.stringify({ resendApiKey: null }),
      });
      setIntegracao(r);
      setChave('');
      setOk(t('config.email.okRemove'));
    } catch (e) {
      setErro(e instanceof Error ? e.message : t('config.email.erroRemover'));
    } finally {
      setSalvandoEmail(false);
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
      setOk(t('config.perigo.ok', { total }));
      setPerigo(null);
      setConfirmacao('');
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : t('config.perigo.erro'));
    } finally {
      setTrabalhando(false);
    }
  }

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [modo, setModo] = useState<'mesclar' | 'substituir'>('mesclar');
  const [confirmaSubstituir, setConfirmaSubstituir] = useState(false);
  const { tema, largura, setTema, setLargura } = useAparencia();

  const ABAS: Array<{ valor: Aba; rotulo: string }> = [
    { valor: 'geral', rotulo: t('config.abas.geral') },
    { valor: 'backup', rotulo: t('config.abas.backup') },
    { valor: 'email', rotulo: t('config.abas.email') },
    { valor: 'perigo', rotulo: t('config.abas.perigo') },
  ];
  const TEMAS: Array<{ valor: Tema; rotulo: string }> = [
    { valor: 'claro', rotulo: t('config.temas.claro') },
    { valor: 'escuro', rotulo: t('config.temas.escuro') },
    { valor: 'sistema', rotulo: t('config.temas.sistema') },
  ];
  const LARGURAS: Array<{ valor: Largura; rotulo: string }> = [
    { valor: 'fluida', rotulo: t('config.larguras.fluida') },
    { valor: 'fixa', rotulo: t('config.larguras.fixa') },
  ];

  async function importar() {
    if (!arquivo) return;
    setTrabalhando(true);
    try {
      setErro('');
      setOk('');
      let backup: unknown;
      try {
        backup = JSON.parse(await arquivo.text());
      } catch {
        throw new Error(t('config.importar.erroJson'));
      }
      const r = await api<{
        modo: string;
        categorias: number;
        formasPagamento: number;
        contas: number;
        receitas: number;
        despesas: number;
      }>('/api/importar', { method: 'POST', body: JSON.stringify({ modo, backup }) });
      setOk(
        t('config.importar.ok', {
          modo: r.modo,
          contas: r.contas,
          rec: r.receitas,
          des: r.despesas,
          cats: r.categorias,
          formas: r.formasPagamento,
        }),
      );
      setArquivo(null);
      setConfirmaSubstituir(false);
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : t('config.importar.erro'));
    } finally {
      setTrabalhando(false);
    }
  }

  const itens: Array<[string, number | undefined]> = [
    [t('layout.nav.contas'), contagem?.contas],
    [t('resumo.receitas'), contagem?.receitas],
    [t('resumo.despesas'), contagem?.despesas],
    [t('layout.nav.categorias'), contagem?.categorias],
    [t('layout.nav.formasPagamento'), contagem?.formasPagamento],
  ];

  const card = 'rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800';
  const btnSec =
    'rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60';
  const btnDanger =
    'rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60';

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <TituloPagina Icon={IconeEngrenagem}>{t('config.titulo')}</TituloPagina>
      <AlertaErro mensagem={erro} />
      {ok && (
        <p role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-900">
          {ok}
        </p>
      )}

      <nav aria-label={t('config.secoes')} role="tablist" className="grid grid-cols-4 gap-1 rounded-2xl bg-white dark:bg-slate-900 p-1.5 text-sm font-semibold shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        {ABAS.map((a) => (
          <button
            key={a.valor}
            type="button"
            role="tab"
            aria-selected={aba === a.valor}
            onClick={() => setAba(a.valor)}
            className={`rounded-xl px-2 py-2.5 transition ${
              aba === a.valor
                ? a.valor === 'perigo'
                  ? 'bg-red-600 text-white shadow'
                  : 'bg-slate-900 text-white shadow'
                : a.valor === 'perigo'
                  ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {a.rotulo}
          </button>
        ))}
      </nav>

      {aba === 'geral' && (
        <div role="tabpanel" className="space-y-6">
      <section aria-label={t('config.dados')} className={card}>
        <h2 className="text-base font-bold">{t('config.dados')}</h2>
        {carregando ? (
          <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">{t('comum.carregando')}</p>
        ) : (
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {itens.map(([rotulo, n]) => (
              <div key={rotulo} className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 text-center ring-1 ring-inset ring-slate-100 dark:ring-slate-800">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500">{rotulo}</dt>
                <dd className="mt-0.5 text-xl font-bold tabular-nums">{n ?? '—'}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section aria-label={t('config.aparencia')} className={card}>
        <h2 className="text-base font-bold">{t('config.aparencia')}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('config.idioma.label')}</p>
            <div className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
              {(['pt-BR', 'en'] as Idioma[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => salvarIdioma(l)}
                  aria-pressed={i18n.language === l}
                  className={`rounded-lg px-3 py-2 transition ${
                    i18n.language === l
                      ? 'bg-slate-900 text-white shadow'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {l === 'pt-BR' ? t('config.idioma.pt') : t('config.idioma.en')}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{t('config.idioma.ajuda')}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('config.tema')}</p>
            <div className="mt-1 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
              {TEMAS.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => setTema(t.valor)}
                  aria-pressed={tema === t.valor}
                  className={`rounded-lg px-3 py-2 transition ${
                    tema === t.valor
                      ? 'bg-slate-900 text-white shadow'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {t.rotulo}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('config.largura')}</p>
            <div className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold dark:bg-slate-800">
              {LARGURAS.map((l) => (
                <button
                  key={l.valor}
                  type="button"
                  onClick={() => setLargura(l.valor)}
                  aria-pressed={largura === l.valor}
                  className={`rounded-lg px-3 py-2 transition ${
                    largura === l.valor
                      ? 'bg-slate-900 text-white shadow'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {l.rotulo}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          {t('config.aparenciaAjuda')}
        </p>
      </section>
        </div>
      )}

      {aba === 'backup' && (
        <div role="tabpanel" className="space-y-6">
      <section aria-label={t('config.demo.titulo')} className={card}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold">{t('config.demo.titulo')}</h2>
          {demo && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${
              demo.existe
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900'
                : 'bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700'
            }`}>
              {demo.existe
                ? t('config.demo.ativa', { contas: demo.contas, lancamentos: demo.receitas + demo.despesas })
                : t('config.demo.inativa')}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          {t('config.demo.texto')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {!demo?.existe ? (
            <button type="button" onClick={gerarDemo} disabled={trabalhando} className={btnSec}>
              {trabalhando ? t('config.demo.gerando') : t('config.demo.gerar')}
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmarDemo(true)} disabled={trabalhando} className={btnSec}>
              {t('config.demo.remover')}
            </button>
          )}
        </div>
      </section>

      <section aria-label={t('config.exportar.titulo')} className={card}>
        <h2 className="text-base font-bold">{t('config.exportar.titulo')}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          {t('config.exportar.texto')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={exportarJSON} disabled={trabalhando} className={btnSec}>
            {t('config.exportar.json')}
          </button>
          <button type="button" onClick={() => exportarCSV('receitas')} disabled={trabalhando} className={btnSec}>
            {t('config.exportar.receitas')}
          </button>
          <button type="button" onClick={() => exportarCSV('despesas')} disabled={trabalhando} className={btnSec}>
            {t('config.exportar.despesas')}
          </button>
        </div>
      </section>

      <section aria-label={t('config.importar.titulo')} className={card}>
        <h2 className="text-base font-bold">{t('config.importar.titulo')}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          {t('config.importar.texto')}
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
            {t('config.importar.arquivo')}
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
            />
          </label>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-sm font-semibold">
            {(['mesclar', 'substituir'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setModo(m); setConfirmaSubstituir(false); }}
                className={`rounded-lg px-3 py-2 capitalize transition ${
                  modo === m ? 'bg-slate-900 text-white shadow' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:text-slate-200 dark:hover:text-slate-200'
                }`}
              >
                {t(`config.importar.${m}`)}
              </button>
            ))}
          </div>
          {modo === 'substituir' && (
            <label className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/50 px-3 py-2.5 text-sm text-red-800 dark:text-red-300 ring-1 ring-inset ring-red-200">
              <input
                type="checkbox"
                checked={confirmaSubstituir}
                onChange={(e) => setConfirmaSubstituir(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-red-600"
              />
              {t('config.importar.confirmaSubstituir')}
            </label>
          )}
          <button
            type="button"
            onClick={importar}
            disabled={trabalhando || !arquivo || (modo === 'substituir' && !confirmaSubstituir)}
            className={btnSec}
          >
            {trabalhando ? t('config.importar.importando') : t('config.importar.botao')}
          </button>
        </div>
      </section>

      <section aria-label={t('config.catalogo.titulo')} className={card}>
        <h2 className="text-base font-bold">{t('config.catalogo.titulo')}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          {t('config.catalogo.texto')}
        </p>
        <div className="mt-4">
          <button type="button" onClick={restaurar} disabled={trabalhando} className={btnSec}>
            {t('config.catalogo.botao')}
          </button>
        </div>
      </section>
        </div>
      )}

      {aba === 'email' && (
        <div role="tabpanel" className="space-y-6">
      <section aria-label={t('config.abas.email')} className={card}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold">{t('config.email.titulo')}</h2>
          {integracao ? (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${
              integracao.email.configurado
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900'
                : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900'
            }`}>
              {integracao.email.configurado
                ? t('config.email.ativo', { mascarada: integracao.email.mascarada })
                : t('config.email.inativo')}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">{t('comum.carregando')}</span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          {t('config.email.intro')}
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
          <li>
            {t('config.email.passo1a')}{' '}
            <a href="https://resend.com" target="_blank" rel="noreferrer" className="font-semibold text-sky-700 underline dark:text-sky-400">
              resend.com
            </a>{' '}
            {t('config.email.passo1b')}
          </li>
          <li>{t('config.email.passo2')}</li>
          <li>{t('config.email.passo3')}</li>
        </ol>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {t('config.email.semDominio')}
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
            {t('config.email.chaveLabel')}
            <span className="mt-1 flex gap-2">
              <input
                type={mostrarChave ? 'text' : 'password'}
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                placeholder={integracao?.email.origem === 'ambiente' ? t('config.email.placeholderAmbiente') : 're_…'}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              />
              <button
                type="button"
                onClick={() => setMostrarChave((v) => !v)}
                aria-pressed={mostrarChave}
                className={btnSec}
              >
                {mostrarChave ? t('config.email.ocultar') : t('config.email.mostrar')}
              </button>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={salvarChave}
              disabled={salvandoEmail || !chave.trim()}
              className={btnSec}
            >
              {salvandoEmail ? t('comum.salvando') : t('config.email.salvar')}
            </button>
            {integracao?.email.origem === 'conta' && (
              <button
                type="button"
                onClick={removerChave}
                disabled={salvandoEmail}
                className={btnSec}
              >
                {t('config.email.remover')}
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          {t('config.email.nota')}
          {integracao?.email.origem === 'ambiente' ? t('config.email.notaAmbiente') : ''}
        </p>
      </section>
        </div>
      )}

      {aba === 'perigo' && (
        <div role="tabpanel" className="space-y-6">
      <section aria-label={t('config.perigo.titulo')} className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-red-200">
        <h2 className="text-base font-bold text-red-700 dark:text-red-400">{t('config.perigo.titulo')}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          {t('config.perigo.texto')}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setPerigo({
                path: '/api/dados/lancamentos',
                titulo: t('config.perigo.tituloLancamentos'),
                detalhe: t('config.perigo.detalheLancamentos'),
              })
            }
            className={btnDanger}
          >
            {t('config.perigo.apagarLancamentos')}
          </button>
          <button
            type="button"
            onClick={() =>
              setPerigo({
                path: '/api/dados/tudo',
                titulo: t('config.perigo.tituloTudo'),
                detalhe: t('config.perigo.detalheTudo'),
              })
            }
            className={btnDanger}
          >
            {t('config.perigo.apagarTudo')}
          </button>
        </div>
      </section>
        </div>
      )}

      <StatusSync carregando={carregando} erro={erro} sincronizadoEm={sincronizadoEm} />

      {perigo && (
        <Modal titulo={perigo.titulo} onFechar={() => { setPerigo(null); setConfirmacao(''); }}>
          <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{perigo.detalhe}</p>
          <label className="mt-4 block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
            {t('config.perigo.digite')}
            <input
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder="APAGAR"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
            />
          </label>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={executarPerigo}
              disabled={trabalhando || confirmacao.trim().toUpperCase() !== 'APAGAR'}
              className={btnDanger}
            >
              {trabalhando ? t('config.perigo.apagando') : t('config.perigo.confirmarExclusao')}
            </button>
            <button
              type="button"
              onClick={() => { setPerigo(null); setConfirmacao(''); }}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800"
            >
              {t('comum.cancelar')}
            </button>
          </div>
        </Modal>
      )}

      {confirmarDemo && (
        <Modal titulo={t('config.demo.removerTitulo')} onFechar={() => setConfirmarDemo(false)}>
          <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
            {t('config.demo.removerTexto')}
          </p>
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={removerDemo}
              disabled={trabalhando}
              className={btnDanger}
            >
              {trabalhando ? t('config.demo.removendo') : t('config.demo.confirmarRemocao')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmarDemo(false)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800"
            >
              {t('comum.cancelar')}
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
