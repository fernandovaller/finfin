import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth';
import { AlertaErro } from '../ui';

type Modo = 'entrar' | 'criar';

export default function Login() {
  const { entrar, criarConta } = useAuth();
  const { t } = useTranslation();
  const navegar = useNavigate();
  const [modo, setModo] = useState<Modo>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      if (modo === 'entrar') {
        await entrar(email.trim(), senha);
      } else {
        await criarConta(nome.trim(), email.trim(), senha);
      }
      navegar('/', { replace: true });
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('comum.falhaAuth'));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1 shadow-lg shadow-slate-950/40">
            <img src="/favicon-96x96.png" alt={t('layout.logoAlt')} className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight text-white">FinFin</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('layout.subtitulo')}</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1" role="tablist">
            {(
              [
                ['entrar', t('login.entrar')],
                ['criar', t('login.criarConta')],
              ] as Array<[Modo, string]>
            ).map(([m, rotulo]) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={modo === m}
                onClick={() => {
                  setModo(m);
                  setErro('');
                }}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                  modo === m ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-300'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>

          <h1 className="mt-5 text-base font-bold">
            {modo === 'entrar' ? t('login.tituloEntrar') : t('login.tituloCriar')}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {modo === 'entrar' ? t('login.subEntrar') : t('login.subCriar')}
          </p>

          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            {modo === 'criar' && (
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('login.nome')}</span>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder={t('login.nomePlaceholder')}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </label>
            )}
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('login.email')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder={t('login.emailPlaceholder')}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('login.senha')}</span>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={modo === 'criar' ? 8 : 1}
                autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
                placeholder={modo === 'criar' ? t('login.senhaPlaceholderCriar') : t('login.senhaPlaceholderEntrar')}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            <AlertaErro mensagem={erro} />
            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {enviando ? t('comum.aguarde') : modo === 'entrar' ? t('login.entrar') : t('login.criarConta')}
            </button>
          </form>
          {modo === 'entrar' && (
            <Link
              to="/recuperar-senha"
              className="mt-3 block text-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              {t('login.esqueci')}
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
