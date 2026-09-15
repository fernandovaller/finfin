import type { ReactNode } from 'react';

/* ---------- formatação ---------- */

export const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const mesAtual = () => new Date().toISOString().slice(0, 7);

export function mesLabel(mes: string): string {
  const [ano, m] = mes.split('-').map(Number);
  return new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function deslocarMes(mes: string, delta: number): string {
  const [ano, m] = mes.split('-').map(Number);
  const d = new Date(ano, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatarData(iso: string): string {
  const [a, m, d] = iso.split('-');
  return d && m ? `${d}/${m}` : iso;
}

export function pluralLancamentos(n: number): string {
  return `${n} lançamento${n === 1 ? '' : 's'}`;
}

/* ---------- cores de categoria (chave do banco -> classes tailwind) ---------- */

const COR_MAP: Record<string, string> = {
  sky: 'bg-sky-100 text-sky-800 ring-sky-200',
  violet: 'bg-violet-100 text-violet-800 ring-violet-200',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
  pink: 'bg-pink-100 text-pink-800 ring-pink-200',
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  teal: 'bg-teal-100 text-teal-800 ring-teal-200',
  rose: 'bg-rose-100 text-rose-800 ring-rose-200',
  slate: 'bg-slate-200 text-slate-700 ring-slate-300',
};

const COR_SWATCH: Record<string, string> = {
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  pink: 'bg-pink-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400',
};

export function corBadge(cor: string): string {
  return COR_MAP[cor] ?? COR_MAP.slate;
}

export function corSwatch(cor: string): string {
  return COR_SWATCH[cor] ?? COR_SWATCH.slate;
}

export function BadgeCategoria({ nome, cor }: { nome: string; cor: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${corBadge(cor)}`}>
      {nome}
    </span>
  );
}

/* ---------- ícones ---------- */

function Svg({ children, className }: { children: ReactNode; className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      {children}
    </svg>
  );
}

export const IconeCasa = ({ className }: { className: string }) => (
  <Svg className={className}>
    <path d="M3 10.5L12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconeExtrato = ({ className }: { className: string }) => (
  <Svg className={className}>
    <path d="M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM9 8h6M9 12h6M9 16h4" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconeGrafico = ({ className }: { className: string }) => (
  <Svg className={className}>
    <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconeTag = ({ className }: { className: string }) => (
  <Svg className={className}>
    <path d="M20 12l-8 8-9-9V4h7l10 8zM7.5 7.5h.01" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconeCarteira = ({ className }: { className: string }) => (
  <Svg className={className}>
    <path d="M20 7H5a2 2 0 01-2-2 2 2 0 012-2h13v4zM3 5v13a2 2 0 002 2h16V7M16 13.5h.01" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export const IconeSeta = ({ direcao, className }: { direcao: 'cima' | 'baixo'; className: string }) => (
  <Svg className={className}>
    <path
      d={direcao === 'cima' ? 'M7 17L17 7M7 7h10v10' : 'M7 7l10 10M17 7v10H7'}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconeLapiz = ({ className }: { className: string }) => (
  <Svg className={className}>
    <path
      d="M16.5 3.5a2.1 2.1 0 013 3L8 18l-4 1 1-4L16.5 3.5z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconeLixeira = ({ className }: { className: string }) => (
  <Svg className={className}>
    <path
      d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconeUsuario = ({ className }: { className: string }) => (
  <Svg className={className}>
    <path
      d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const IconeEngrenagem = ({ className }: { className: string }) => (
  <Svg className={className}>
    <path
      d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1zM12 15a3 3 0 100-6 3 3 0 000 6z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/* ---------- avatar (foto ou iniciais) ---------- */

const AVATAR_CORES = [
  'bg-emerald-600',
  'bg-sky-600',
  'bg-violet-600',
  'bg-amber-600',
  'bg-pink-600',
  'bg-teal-600',
  'bg-rose-600',
  'bg-slate-600',
];

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function corAvatar(nome: string): string {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.codePointAt(0)!) >>> 0;
  return AVATAR_CORES[h % AVATAR_CORES.length];
}

export function Avatar({
  nome,
  avatar,
  tamanho = 'md',
}: {
  nome: string;
  avatar?: string | null;
  tamanho?: 'sm' | 'md' | 'lg';
}) {
  const tam = tamanho === 'lg' ? 'h-20 w-20 text-2xl' : tamanho === 'sm' ? 'h-8 w-8 text-xs' : 'h-11 w-11 text-sm';
  if (avatar) {
    return <img src={avatar} alt={`Foto de ${nome}`} className={`${tam} rounded-full object-cover ring-2 ring-white/20`} />;
  }
  return (
    <div
      aria-hidden={!nome}
      title={nome}
      className={`${tam} flex shrink-0 items-center justify-center rounded-full font-bold text-white ${corAvatar(nome)}`}
    >
      {iniciais(nome)}
    </div>
  );
}

/* ---------- componentes compartilhados ---------- */

export function MesNav({ mes, onChange }: { mes: string; onChange: (m: string) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-slate-800 p-1">
      <button
        type="button"
        onClick={() => onChange(deslocarMes(mes, -1))}
        className="rounded-lg px-3 py-1.5 text-lg leading-none text-slate-300 transition hover:bg-slate-700 hover:text-white"
        aria-label="Mês anterior"
      >
        ‹
      </button>
      <input
        type="month"
        value={mes}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="bg-transparent px-2 py-1.5 text-sm font-medium text-white outline-none [color-scheme:dark]"
      />
      <button
        type="button"
        onClick={() => onChange(deslocarMes(mes, 1))}
        className="rounded-lg px-3 py-1.5 text-lg leading-none text-slate-300 transition hover:bg-slate-700 hover:text-white"
        aria-label="Próximo mês"
      >
        ›
      </button>
    </div>
  );
}

export function AlertaErro({ mensagem }: { mensagem: string }) {
  if (!mensagem) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
    >
      {mensagem}
    </p>
  );
}

export function Modal({
  titulo,
  onFechar,
  children,
  wide,
}: {
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onFechar}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ${wide ? 'max-w-md' : 'max-w-sm'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-titulo" className="text-base font-bold">
          {titulo}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmarExclusao({
  descricao,
  onCancelar,
  onConfirmar,
}: {
  descricao: string;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <Modal titulo="Excluir?" onFechar={onCancelar}>
      <p className="text-sm text-slate-600">
        Tem certeza que deseja excluir <strong>“{descricao}”</strong>? Essa ação não pode ser
        desfeita.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
        >
          Excluir
        </button>
      </div>
    </Modal>
  );
}

export function StatusSync({
  carregando,
  erro,
  sincronizadoEm,
}: {
  carregando: boolean;
  erro: string;
  sincronizadoEm: Date | null;
}) {
  return (
    <footer className="flex items-center justify-center gap-2 pb-4 text-xs text-slate-400">
      {carregando ? (
        <>
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
          Sincronizando…
        </>
      ) : erro ? (
        <>
          <span className="h-2 w-2 rounded-full bg-red-500" />
          Falha na sincronização
        </>
      ) : (
        <>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          {sincronizadoEm
            ? `Sincronizado às ${sincronizadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
            : 'Sincronizado'}
        </>
      )}
    </footer>
  );
}
