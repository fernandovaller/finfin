import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Tema = 'claro' | 'escuro' | 'sistema';
export type Largura = 'fluida' | 'fixa';

const TEMA_KEY = 'finfin_tema';
const LARGURA_KEY = 'finfin_largura';

function lerTema(): Tema {
  const v = localStorage.getItem(TEMA_KEY);
  return v === 'claro' || v === 'escuro' || v === 'sistema' ? v : 'sistema';
}

function lerLargura(): Largura {
  return localStorage.getItem(LARGURA_KEY) === 'fixa' ? 'fixa' : 'fluida';
}

function prefereEscuro(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function temaEfetivo(t: Tema): 'claro' | 'escuro' {
  if (t !== 'sistema') return t;
  return prefereEscuro() ? 'escuro' : 'claro';
}

function aplicar(t: Tema, l: Largura): void {
  document.documentElement.classList.toggle('dark', temaEfetivo(t) === 'escuro');
  document.documentElement.dataset.largura = l;
}

interface Prefs {
  tema: Tema;
  largura: Largura;
  setTema: (t: Tema) => void;
  setLargura: (l: Largura) => void;
}

const Ctx = createContext<Prefs | null>(null);

export function ProvedorAparencia({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Tema>(() => lerTema());
  const [largura, setLarguraState] = useState<Largura>(() => lerLargura());

  useEffect(() => {
    aplicar(tema, largura);
    if (tema !== 'sistema') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => aplicar(tema, largura);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [tema, largura]);

  const setTema = (t: Tema) => {
    localStorage.setItem(TEMA_KEY, t);
    setTemaState(t);
  };
  const setLargura = (l: Largura) => {
    localStorage.setItem(LARGURA_KEY, l);
    setLarguraState(l);
  };
  return <Ctx.Provider value={{ tema, largura, setTema, setLargura }}>{children}</Ctx.Provider>;
}

export function useAparencia(): Prefs {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAparencia fora do ProvedorAparencia');
  return v;
}
