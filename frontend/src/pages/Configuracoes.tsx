import { useEffect, useState } from 'react';
import { api } from '../api';
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

type Aba = 'geral' | 'backup' | 'email' | 'perigo';

const ABAS: Array<{ valor: Aba; rotulo: string }> = [
  { valor: 'geral', rotulo: 'Geral' },
  { valor: 'backup', rotulo: 'Backup' },
  { valor: 'email', rotulo: 'E-mail' },
  { valor: 'perigo', rotulo: 'Zona de perigo' },
];

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
  const [aba, setAba] = useState<Aba>('geral');
  const [integracao, setIntegracao] = useState<StatusIntegracoes | null>(null);
  const [chave, setChave] = useState('');
  const [mostrarChave, setMostrarChave] = useState(false);
  const [salvandoEmail, setSalvandoEmail] = useState(false);

  async function recarregar() {
    try {
      setErro('');
      const [contagemAtual, integracaoAtual] = await Promise.all([
        api<Contagem>('/api/contagem'),
        api<StatusIntegracoes>('/api/auth/integracoes'),
      ]);
      setContagem(contagemAtual);
      setIntegracao(integracaoAtual);
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
      setOk('Chave do Resend salva.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar chave');
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
      setOk('Chave removida da sua conta.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao remover chave');
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

  const [arquivo, setArquivo] = useState<File | null>(null);
  const [modo, setModo] = useState<'mesclar' | 'substituir'>('mesclar');
  const [confirmaSubstituir, setConfirmaSubstituir] = useState(false);
  const { tema, largura, setTema, setLargura } = useAparencia();

  const TEMAS: Array<{ valor: Tema; rotulo: string }> = [
    { valor: 'claro', rotulo: 'Claro' },
    { valor: 'escuro', rotulo: 'Escuro' },
    { valor: 'sistema', rotulo: 'Sistema' },
  ];
  const LARGURAS: Array<{ valor: Largura; rotulo: string }> = [
    { valor: 'fluida', rotulo: 'Fluida' },
    { valor: 'fixa', rotulo: 'Fixa' },
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
        throw new Error('Arquivo inválido — não é um JSON válido');
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
        `Importação (${r.modo}): ${r.contas} conta(s), ${r.receitas} receita(s), ${r.despesas} despesa(s), ${r.categorias} categoria(s), ${r.formasPagamento} forma(s) novas.`,
      );
      setArquivo(null);
      setConfirmaSubstituir(false);
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao importar');
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

  const card = 'rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800';
  const btnSec =
    'rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60';
  const btnDanger =
    'rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60';

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <TituloPagina Icon={IconeEngrenagem}>Configurações</TituloPagina>
      <AlertaErro mensagem={erro} />
      {ok && (
        <p role="status" className="rounded-xl bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-900">
          {ok}
        </p>
      )}

      <nav aria-label="Seções de configurações" role="tablist" className="grid grid-cols-4 gap-1 rounded-2xl bg-white dark:bg-slate-900 p-1.5 text-sm font-semibold shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
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
      <section aria-label="Seus dados" className={card}>
        <h2 className="text-base font-bold">Seus dados</h2>
        {carregando ? (
          <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">Carregando…</p>
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

      <section aria-label="Aparência" className={card}>
        <h2 className="text-base font-bold">Aparência</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Tema</p>
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
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Largura do conteúdo</p>
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
          “Sistema” acompanha o modo claro/escuro do seu dispositivo. “Fixa” centraliza o conteúdo
          em largura limitada; “Fluida” usa toda a tela.
        </p>
      </section>
        </div>
      )}

      {aba === 'backup' && (
        <div role="tabpanel" className="space-y-6">
      <section aria-label="Exportar dados" className={card}>
        <h2 className="text-base font-bold">Exportar dados</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
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

      <section aria-label="Importar backup" className={card}>
        <h2 className="text-base font-bold">Importar backup</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          Restaura o arquivo JSON gerado em “Backup completo”. Mesclar reaproveita contas e catálogo
          existentes; substituir apaga lançamentos e contas atuais antes de importar.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
            Arquivo JSON
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
                {m}
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
              Entendo que lançamentos e contas atuais serão apagados antes da importação.
            </label>
          )}
          <button
            type="button"
            onClick={importar}
            disabled={trabalhando || !arquivo || (modo === 'substituir' && !confirmaSubstituir)}
            className={btnSec}
          >
            {trabalhando ? 'Importando…' : 'Importar backup'}
          </button>
        </div>
      </section>

      <section aria-label="Catálogo" className={card}>
        <h2 className="text-base font-bold">Catálogo</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          Repõe categorias e formas de pagamento padrão que foram excluídas, sem duplicar o que já existe.
        </p>
        <div className="mt-4">
          <button type="button" onClick={restaurar} disabled={trabalhando} className={btnSec}>
            Restaurar itens padrão
          </button>
        </div>
      </section>
        </div>
      )}

      {aba === 'email' && (
        <div role="tabpanel" className="space-y-6">
      <section aria-label="E-mail" className={card}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold">E-mail (Resend)</h2>
          {integracao ? (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${
              integracao.email.configurado
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900'
                : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900'
            }`}>
              {integracao.email.configurado
                ? `Ativo · ${integracao.email.mascarada}`
                : 'Não configurado'}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-slate-500">Carregando…</span>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
          Ativa os e-mails de recuperação de senha. Para conseguir a chave:
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">
          <li>
            Crie a conta grátis em{' '}
            <a href="https://resend.com" target="_blank" rel="noreferrer" className="font-semibold text-sky-700 underline dark:text-sky-400">
              resend.com
            </a>{' '}
            (plano grátis: 100 e-mails/dia).
          </li>
          <li>Em <strong>API Keys</strong>, crie uma chave com permissão de envio (<em>Sending access</em>).</li>
          <li>Cole a chave abaixo (começa com <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 font-mono text-xs">re_</code>) e salve.</li>
        </ol>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          Sem domínio próprio verificado no Resend, os e-mails só chegam ao e-mail da sua conta Resend.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
            Chave da API
            <span className="mt-1 flex gap-2">
              <input
                type={mostrarChave ? 'text' : 'password'}
                value={chave}
                onChange={(e) => setChave(e.target.value)}
                placeholder={integracao?.email.origem === 'ambiente' ? 'Usando chave do servidor (.env)' : 're_…'}
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
                {mostrarChave ? 'Ocultar' : 'Mostrar'}
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
              {salvandoEmail ? 'Salvando…' : 'Salvar chave'}
            </button>
            {integracao?.email.origem === 'conta' && (
              <button
                type="button"
                onClick={removerChave}
                disabled={salvandoEmail}
                className={btnSec}
              >
                Remover
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          A chave fica salva só na sua conta e nunca é exibida inteira de novo.
          {integracao?.email.origem === 'ambiente'
            ? ' Há uma chave global no servidor (.env); a salva aqui vale só para você.'
            : ''}
        </p>
      </section>
        </div>
      )}

      {aba === 'perigo' && (
        <div role="tabpanel" className="space-y-6">
      <section aria-label="Zona de perigo" className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-red-200">
        <h2 className="text-base font-bold text-red-700 dark:text-red-400">Zona de perigo</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
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
        </div>
      )}

      <StatusSync carregando={carregando} erro={erro} sincronizadoEm={sincronizadoEm} />

      {perigo && (
        <Modal titulo={perigo.titulo} onFechar={() => { setPerigo(null); setConfirmacao(''); }}>
          <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500">{perigo.detalhe}</p>
          <label className="mt-4 block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
            Digite <strong>APAGAR</strong> para confirmar
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
              {trabalhando ? 'Apagando…' : 'Confirmar exclusão'}
            </button>
            <button
              type="button"
              onClick={() => { setPerigo(null); setConfirmacao(''); }}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
