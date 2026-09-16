import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { redefinirSenha } from '../api';
import { AlertaErro } from '../ui';

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [pronto, setPronto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    if (novaSenha !== confirmacao) {
      setErro('As senhas não conferem');
      return;
    }
    setEnviando(true);
    try {
      await redefinirSenha(token, novaSenha);
      setPronto(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao redefinir senha');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white p-1 shadow-lg shadow-slate-950/40">
            <img src="/favicon-96x96.png" alt="Logotipo FinFin" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight text-white">FinFin</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Financeiro pessoal</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl">
          <h1 className="text-base font-bold">Criar nova senha</h1>
          {!token ? (
            <>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Link inválido — falta o token. Peça um novo link de recuperação.
              </p>
              <Link
                to="/recuperar-senha"
                className="mt-4 block rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Pedir novo link
              </Link>
            </>
          ) : pronto ? (
            <>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500">
                Senha alterada. Todas as sessões foram encerradas — entre de novo.
              </p>
              <Link
                to="/login"
                className="mt-4 block rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                Ir para o login
              </Link>
            </>
          ) : (
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nova senha</span>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Confirmar senha</span>
                <input
                  type="password"
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  placeholder="Repita a nova senha"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
              </label>
              <AlertaErro mensagem={erro} />
              <button
                type="submit"
                disabled={enviando}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {enviando ? 'Salvando…' : 'Salvar nova senha'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
