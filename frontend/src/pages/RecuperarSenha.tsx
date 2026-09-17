import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { recuperarSenha } from '../api';
import { AlertaErro } from '../ui';

export default function RecuperarSenha() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await recuperarSenha(email.trim());
      setEnviado(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : t('recuperar.erro'));
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
          <h1 className="text-base font-bold">{t('recuperar.titulo')}</h1>
          {enviado ? (
            <>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                {t('recuperar.enviadoTexto')}
              </p>
              <Link
                to="/login"
                className="mt-4 block rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-slate-700"
              >
                {t('recuperar.voltar')}
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                {t('recuperar.informeTexto')}
              </p>
              <form onSubmit={onSubmit} className="mt-4 space-y-3">
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
                <AlertaErro mensagem={erro} />
                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {enviando ? t('recuperar.enviando') : t('recuperar.enviar')}
                </button>
              </form>
              <Link
                to="/login"
                className="mt-3 block text-center text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              >
                {t('recuperar.voltar')}
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
