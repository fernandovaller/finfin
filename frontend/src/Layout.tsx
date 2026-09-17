import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './auth';
import {
  Avatar,
  IconeCarteira,
  IconeCasa,
  IconeEngrenagem,
  IconeExtrato,
  IconeGrafico,
  IconeTag,
} from './ui';

function Navegacao({ onNavegar }: { onNavegar?: () => void }) {
  const { t } = useTranslation();
  const GRUPOS = [
    {
      rotulo: t('layout.grupos.principal'),
      itens: [
        { to: '/', label: t('layout.nav.home'), Icon: IconeCasa },
        { to: '/lancamentos', label: t('layout.nav.lancamentos'), Icon: IconeExtrato },
        { to: '/relatorios', label: t('layout.nav.relatorios'), Icon: IconeGrafico },
      ],
    },
    {
      rotulo: t('layout.grupos.cadastros'),
      itens: [
        { to: '/categorias', label: t('layout.nav.categorias'), Icon: IconeTag },
        { to: '/contas', label: t('layout.nav.contas'), Icon: IconeCarteira },
        { to: '/formas-pagamento', label: t('layout.nav.formasPagamento'), Icon: IconeCarteira },
      ],
    },
    {
      rotulo: t('layout.grupos.sistema'),
      itens: [
        { to: '/configuracoes', label: t('layout.nav.configuracoes'), Icon: IconeEngrenagem },
        { to: '/auditoria', label: t('layout.nav.auditoria'), Icon: IconeExtrato },
      ],
    },
  ];
  return (
    <nav className="space-y-5 px-3">
      {GRUPOS.map((grupo, i) => (
        <div key={grupo.rotulo} className={i > 0 ? 'border-t border-slate-800 pt-4' : ''}>
          <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-500">
            {grupo.rotulo}
          </p>
          <div className="space-y-1">
            {grupo.itens.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onNavegar}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 dark:text-slate-500 hover:bg-slate-800/60 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-emerald-400" />
                    )}
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function Layout() {
  const [aberto, setAberto] = useState(false);
  const { usuario, sair } = useAuth();
  const { t } = useTranslation();
  const navegar = useNavigate();

  async function onSair() {
    await sair();
    navegar('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-800 font-sans text-slate-900 dark:text-slate-100 antialiased">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-slate-900 lg:flex">
        <div className="flex items-center gap-3 px-5 pb-6 pt-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-1 shadow-lg shadow-slate-950/40">
            <img src="/favicon-96x96.png" alt={t('layout.logoAlt')} className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-white">FinFin</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('layout.subtitulo')}</p>
          </div>
        </div>
        <Navegacao />
        <div className="mt-auto space-y-3 px-5 pb-5">
          {usuario && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-800 px-3 py-2">
              <Link to="/perfil" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg">
                <Avatar nome={usuario.nome} avatar={usuario.avatar} tamanho="sm" />
                <p className="min-w-0 truncate text-xs font-semibold text-slate-200" title={usuario.email}>
                  {usuario.nome}
                </p>
              </Link>
              <button
                type="button"
                onClick={onSair}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-slate-400 dark:text-slate-500 transition hover:bg-slate-700 hover:text-white"
              >
                {t('comum.sair')}
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('layout.rodape')}</p>
        </div>
      </aside>

      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between px-5 pb-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white p-1">
                  <img src="/favicon-96x96.png" alt={t('layout.logoAlt')} className="h-full w-full object-contain" />
                </div>
                <p className="text-lg font-bold tracking-tight text-white">FinFin</p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label={t('layout.fecharMenu')}
                className="rounded-lg px-2 py-1 text-xl leading-none text-slate-400 dark:text-slate-500 hover:bg-slate-800 hover:text-white"
              >
                ×
              </button>
            </div>
            <Navegacao onNavegar={() => setAberto(false)} />
            <div className="mt-auto space-y-3 px-5 pb-5">
              {usuario && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-800 px-3 py-2">
                  <Link to="/perfil" onClick={() => setAberto(false)} className="flex min-w-0 flex-1 items-center gap-2 rounded-lg">
                    <Avatar nome={usuario.nome} avatar={usuario.avatar} tamanho="sm" />
                    <p className="min-w-0 truncate text-xs font-semibold text-slate-200" title={usuario.email}>
                      {usuario.nome}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={onSair}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-slate-400 dark:text-slate-500 transition hover:bg-slate-700 hover:text-white"
                  >
                    {t('comum.sair')}
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex items-center gap-3 bg-slate-900 px-4 py-3 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label={t('layout.abrirMenu')}
          className="rounded-lg p-2 transition hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <p className="text-base font-bold tracking-tight">FinFin</p>
      </header>

      <div className="area-app lg:pl-64">
        <Outlet />
      </div>
    </div>
  );
}
