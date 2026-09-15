import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  IconeCarteira,
  IconeCasa,
  IconeExtrato,
  IconeGrafico,
  IconeTag,
} from './ui';

const ITENS = [
  { to: '/', label: 'Home', Icon: IconeCasa },
  { to: '/lancamentos', label: 'Lançamentos', Icon: IconeExtrato },
  { to: '/relatorios', label: 'Relatórios', Icon: IconeGrafico },
  { to: '/categorias', label: 'Categorias', Icon: IconeTag },
  { to: '/formas-pagamento', label: 'Formas de pagamento', Icon: IconeCarteira },
];

function Navegacao({ onNavegar }: { onNavegar?: () => void }) {
  return (
    <nav className="space-y-1 px-3">
      {ITENS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavegar}
          className={({ isActive }) =>
            `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
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
    </nav>
  );
}

export default function Layout() {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-slate-900 lg:flex">
        <div className="flex items-center gap-3 px-5 pb-6 pt-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-xl font-black shadow-lg shadow-emerald-950/40">
            F
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-white">FinFin</p>
            <p className="text-xs text-slate-400">Financeiro pessoal</p>
          </div>
        </div>
        <Navegacao />
        <p className="mt-auto px-5 pb-5 text-xs text-slate-500">FinFin · controle financeiro</p>
      </aside>

      {/* Drawer mobile */}
      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between px-5 pb-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-xl font-black">
                  F
                </div>
                <p className="text-lg font-bold tracking-tight text-white">FinFin</p>
              </div>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar menu"
                className="rounded-lg px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ×
              </button>
            </div>
            <Navegacao onNavegar={() => setAberto(false)} />
          </aside>
        </div>
      )}

      {/* Header mobile */}
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-slate-900 px-4 py-3 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="rounded-lg p-2 transition hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <p className="text-base font-bold tracking-tight">FinFin</p>
      </header>

      <div className="lg:pl-64">
        <Outlet />
      </div>
    </div>
  );
}
