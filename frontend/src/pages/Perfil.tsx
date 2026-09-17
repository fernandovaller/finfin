import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { atualizarPerfil, trocarSenha } from '../api';
import { useAuth } from '../auth';
import { AlertaErro, Avatar, IconeUsuario, TituloPagina } from '../ui';

const MAX_BYTES = 500_000;

export default function Perfil() {
  const { usuario, sincronizar } = useAuth();
  const { t } = useTranslation();
  const [nome, setNome] = useState(usuario?.nome ?? '');
  const [email, setEmail] = useState(usuario?.email ?? '');
  const [avatar, setAvatar] = useState<string | null>(usuario?.avatar ?? null);
  const [erroPerfil, setErroPerfil] = useState('');
  const [okPerfil, setOkPerfil] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirma, setConfirma] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [okSenha, setOkSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  if (!usuario) return null;

  function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (!arq) return;
    if (!arq.type.startsWith('image/')) {
      setErroPerfil(t('perfil.erroImagemTipo'));
      return;
    }
    if (arq.size > MAX_BYTES) {
      setErroPerfil(t('perfil.erroImagemGrande'));
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      setAvatar(String(leitor.result));
      setOkPerfil('');
      setErroPerfil('');
    };
    leitor.onerror = () => setErroPerfil(t('perfil.erroImagemLeitura'));
    leitor.readAsDataURL(arq);
  }

  async function onSalvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setErroPerfil('');
    setOkPerfil('');
    setSalvandoPerfil(true);
    try {
      const { usuario: atual } = await atualizarPerfil({ nome: nome.trim(), email: email.trim(), avatar });
      sincronizar(atual);
      setOkPerfil(t('perfil.okPerfil'));
    } catch (err) {
      setErroPerfil(err instanceof Error ? err.message : t('perfil.erroSalvarPerfil'));
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function onTrocarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErroSenha('');
    setOkSenha('');
    if (novaSenha !== confirma) {
      setErroSenha(t('perfil.erroSenhaConfere'));
      return;
    }
    setSalvandoSenha(true);
    try {
      const { usuario: atual } = await trocarSenha(senhaAtual, novaSenha);
      sincronizar(atual);
      setSenhaAtual('');
      setNovaSenha('');
      setConfirma('');
      setOkSenha(t('perfil.okSenha'));
    } catch (err) {
      setErroSenha(err instanceof Error ? err.message : t('perfil.erroTrocarSenha'));
    } finally {
      setSalvandoSenha(false);
    }
  }

  const campo =
    'mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200';

  return (
    <main className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <TituloPagina Icon={IconeUsuario}>{t('perfil.titulo')}</TituloPagina>

      <section aria-label={t('perfil.dadosLabel')} className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <form onSubmit={onSalvarPerfil} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar nome={nome || usuario.nome} avatar={avatar} tamanho="lg" />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => arquivoRef.current?.click()}
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
              >
                {t('perfil.enviarFoto')}
              </button>
              {avatar && (
                <button
                  type="button"
                  onClick={() => setAvatar(null)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 dark:text-slate-500 transition hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800"
                >
                  {t('perfil.remover')}
                </button>
              )}
              <input ref={arquivoRef} type="file" accept="image/*" onChange={onArquivo} className="hidden" />
            </div>
          </div>
          {!avatar && (
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('perfil.semFoto')}</p>
          )}
          <label className="block">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('login.nome')}</span>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required className={campo} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('login.email')}</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={campo} />
          </label>
          <AlertaErro mensagem={erroPerfil} />
          {okPerfil && (
            <p role="status" className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {okPerfil}
            </p>
          )}
          <button
            type="submit"
            disabled={salvandoPerfil}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {salvandoPerfil ? t('comum.salvando') : t('perfil.salvarPerfil')}
          </button>
        </form>
      </section>

      <section aria-label={t('perfil.trocarTitulo')} className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
        <h2 className="text-base font-bold">{t('perfil.trocarTitulo')}</h2>
        <form onSubmit={onTrocarSenha} className="mt-3 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('perfil.senhaAtual')}</span>
            <input type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required autoComplete="current-password" className={campo} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('perfil.novaSenha')}</span>
            <input type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required minLength={8} autoComplete="new-password" placeholder={t('perfil.senhaPlaceholder')} className={campo} />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('perfil.confirmarNova')}</span>
            <input type="password" value={confirma} onChange={(e) => setConfirma(e.target.value)} required autoComplete="new-password" className={campo} />
          </label>
          <AlertaErro mensagem={erroSenha} />
          {okSenha && (
            <p role="status" className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {okSenha}
            </p>
          )}
          <button
            type="submit"
            disabled={salvandoSenha}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {salvandoSenha ? t('perfil.trocando') : t('perfil.trocar')}
          </button>
        </form>
      </section>
    </main>
  );
}
