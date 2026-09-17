import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BRL, corSwatch } from './ui';

export interface PontoMensal {
  mes: string;
  rotulo: string;
  receitas: number;
  despesas: number;
}

export interface FatiaCategoria {
  nome: string;
  cor: string;
  total: number;
}

const VERDE = '#10b981';
const ROSA = '#f43f5e';

const COR_HEX: Record<string, string> = {
  sky: '#0ea5e9',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  pink: '#ec4899',
  emerald: '#10b981',
  teal: '#14b8a6',
  rose: '#f43f5e',
  slate: '#64748b',
};

function TooltipGrafico({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-bold capitalize">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center justify-between gap-4 tabular-nums">
          <span className="font-medium text-slate-500 dark:text-slate-400">{p.name}</span>
          <span className="font-bold">{BRL.format(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

export function GraficoBarrasMensal({ dados }: { dados: PontoMensal[] }) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barGap={4}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
          <XAxis
            dataKey="rotulo"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            dy={4}
          />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip content={<TooltipGrafico />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
          <Bar name="Receitas" dataKey="receitas" fill={VERDE} radius={[6, 6, 2, 2]} maxBarSize={26} animationDuration={600} />
          <Bar name="Despesas" dataKey="despesas" fill={ROSA} radius={[6, 6, 2, 2]} maxBarSize={26} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TooltipDonut({ active, payload }: { active?: boolean; payload?: { payload: FatiaCategoria }[] }) {
  const f = payload?.[0]?.payload;
  if (!active || !f) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs shadow-lg">
      <p className="font-bold">{f.nome}</p>
      <p className="tabular-nums text-slate-500 dark:text-slate-400">{BRL.format(f.total)}</p>
    </div>
  );
}

export function GraficoDonut({ fatias }: { fatias: FatiaCategoria[] }) {
  const total = fatias.reduce((s, f) => s + f.total, 0);

  if (total <= 0) {
    return (
      <div className="flex h-[240px] items-center justify-center">
        <p className="w-full rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
          Sem despesas neste mês.
        </p>
      </div>
    );
  }

  const visiveis = fatias.slice(0, 7);
  const restoTotal = fatias.slice(7).reduce((s, f) => s + f.total, 0);
  const todas: FatiaCategoria[] =
    restoTotal > 0 ? [...visiveis, { nome: 'Outras', cor: 'slate', total: restoTotal }] : visiveis;

  return (
    <div className="flex h-[240px] flex-col items-center gap-2 sm:flex-row sm:gap-4">
      <div className="relative h-full w-40 shrink-0 sm:w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<TooltipDonut />} />
            <Pie
              data={todas}
              dataKey="total"
              nameKey="nome"
              innerRadius="68%"
              outerRadius="95%"
              paddingAngle={2}
              strokeWidth={0}
              animationDuration={600}
            >
              {todas.map((f) => (
                <Cell key={f.nome} fill={COR_HEX[f.cor] ?? COR_HEX.slate} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold tabular-nums sm:text-lg">{BRL.format(total)}</span>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">total mês</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {todas.map((f) => (
          <li key={f.nome} className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${corSwatch(f.cor)}`} />
            <span className="min-w-0 flex-1 truncate font-medium">{f.nome}</span>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-400 dark:text-slate-500">
              {Math.round((f.total / total) * 100)}%
            </span>
            <span className="w-24 shrink-0 text-right text-sm font-bold tabular-nums">
              {BRL.format(f.total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
