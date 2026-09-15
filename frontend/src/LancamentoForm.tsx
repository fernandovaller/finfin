import { useEffect, useState } from 'react';
import type { Conta } from './api';

export type TipoLancamento = 'receita' | 'despesa';

export interface LancamentoValues {
  data: string;
  valor: number;
  categoria: string;
  origem: string;
  formaPagamento: string;
  contaId: number | '';
  nota: string;
  parcelas: number;
}

interface Props {
  tipo: TipoLancamento;
  onTipoChange?: (t: TipoLancamento) => void;
  categoriasReceita: string[];
  categoriasDespesa: string[];
  formas: string[];
  contas: Conta[];
  initial?: Partial<LancamentoValues>;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (v: LancamentoValues) => void;
  onErro: (msg: string) => void;
}

/** Máscara de moeda: dígitos digitados viram centavos (ex.: "25000" → "250,00"). */
function mascaraMoeda(digitos: string): string {
  if (digitos === '') return '';
  return (Number(digitos) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const ACCENT: Record<TipoLancamento, { focus: string; submit: string }> = {
  receita: {
    focus: 'focus:border-emerald-500 focus:ring-emerald-200',
    submit: 'bg-emerald-600 hover:bg-emerald-700',
  },
  despesa: {
    focus: 'focus:border-rose-500 focus:ring-rose-200',
    submit: 'bg-rose-600 hover:bg-rose-700',
  },
};

const inputBase =
  'w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none transition focus:ring-2';

export default function LancamentoForm({
  tipo,
  onTipoChange,
  categoriasReceita,
  categoriasDespesa,
  formas,
  contas,
  initial,
  submitLabel,
  submitting,
  onSubmit,
  onErro,
}: Props) {
  const opcoes = tipo === 'receita' ? categoriasReceita : categoriasDespesa;
  const principal = contas.find((c) => c.principal);
  const [data, setData] = useState(initial?.data ?? new Date().toISOString().slice(0, 10));
  const [valor, setValor] = useState(
    initial?.valor !== undefined ? String(Math.round(initial.valor * 100)) : '',
  ); // dígitos em centavos
  const [categoria, setCategoria] = useState(
    initial?.categoria ?? opcoes[0] ?? '',
  );
  const [origem, setOrigem] = useState(initial?.origem ?? '');
  const [formaPagamento, setFormaPagamento] = useState(initial?.formaPagamento ?? '');
  const [contaId, setContaId] = useState<number | ''>(initial?.contaId ?? principal?.id ?? contas[0]?.id ?? '');
  const [nota, setNota] = useState(initial?.nota ?? '');
  const [parcelas, setParcelas] = useState(initial?.parcelas ?? 1);
  const accent = ACCENT[tipo];

  const mostraParcelas = tipo === 'despesa' && !initial?.categoria;

  // Catálogo carrega async: form monta com opcoes=[] e categoria=''.
  // Sem sync, state fica '' mesmo após opções chegarem -> submit falha
  // com "Escolha uma categoria" embora select mostre primeira opção.
  useEffect(() => {
    if (!categoria && opcoes.length > 0) {
      setCategoria(opcoes[0]);
    }
  }, [opcoes, categoria]);

  // Conta carrega async: pré-seleciona principal (ou primeira) quando chegar.
  useEffect(() => {
    if (contaId === '' && contas.length > 0) {
      setContaId(principal?.id ?? contas[0].id);
    }
  }, [contas, contaId, principal?.id]);

  // Preserva categoria histórica que já saiu do catálogo (ex.: renomeada).
  const opcoesCategoria =
    categoria && !opcoes.includes(categoria) ? [categoria, ...opcoes] : opcoes;

  function trocarTipo(t: TipoLancamento) {
    onTipoChange?.(t);
    const lista = t === 'receita' ? categoriasReceita : categoriasDespesa;
    setCategoria(lista[0] ?? '');
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const valorNum = Number(valor) / 100;
    if (!(valorNum > 0)) {
      onErro('Informe um valor maior que zero.');
      return;
    }
    if (!categoria) {
      onErro('Escolha uma categoria (cadastre em Categorias se precisar).');
      return;
    }
    if (contaId === '') {
      onErro('Escolha a conta do lançamento (cadastre em Contas se precisar).');
      return;
    }
    if (mostraParcelas && (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 21)) {
      onErro('Parcelas deve ser de 1 a 21.');
      return;
    }
    onSubmit({ data, valor: valorNum, categoria, origem, formaPagamento, contaId, nota, parcelas: mostraParcelas ? parcelas : 1 });
  }

  return (
    <div>
      {onTipoChange && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-sm font-semibold">
          {(['despesa', 'receita'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => trocarTipo(t)}
              className={`rounded-lg px-3 py-2 capitalize transition ${
                tipo === t
                  ? t === 'receita'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-900 text-white shadow'
                  : 'text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:text-slate-200 dark:hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={enviar} className="mt-4 space-y-3">
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
          Conta
          <select
            value={contaId}
            onChange={(e) => setContaId(e.target.value === '' ? '' : Number(e.target.value))}
            required
            className={`mt-1 ${inputBase} bg-white dark:bg-slate-900 ${accent.focus}`}
          >
            {contas.length === 0 && <option value="">Nenhuma conta cadastrada</option>}
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icone ? `${c.icone} ` : ''}{c.nome}{c.principal ? ' ★' : ''}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
            Data
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className={`mt-1 ${inputBase} ${accent.focus}`}
            />
          </label>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
            Valor
            <div className="relative mt-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400 dark:text-slate-500">
                R$
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={mascaraMoeda(valor)}
                onChange={(e) => setValor(e.target.value.replace(/\D/g, '').slice(0, 12))}
                required
                placeholder="0,00"
                className={`w-full rounded-lg border border-slate-300 dark:border-slate-700 py-2 pl-10 pr-3 text-sm tabular-nums text-slate-900 dark:text-slate-100 outline-none transition focus:ring-2 ${accent.focus}`}
              />
            </div>
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
          Categoria
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            required
            className={`mt-1 ${inputBase} bg-white dark:bg-slate-900 ${accent.focus}`}
          >
            {opcoesCategoria.length === 0 && <option value="">Nenhuma categoria cadastrada</option>}
            {opcoesCategoria.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
          {tipo === 'receita' ? 'Origem' : 'Descrição'}
          <input
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            required={tipo === 'receita'}
            placeholder={tipo === 'receita' ? 'Ex.: Empresa' : 'Ex.: Aluguel'}
            className={`mt-1 ${inputBase} ${accent.focus}`}
          />
        </label>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
          Forma de pagamento
          <select
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
            className={`mt-1 ${inputBase} bg-white dark:bg-slate-900 ${accent.focus}`}
          >
            <option value="">Não informada</option>
            {formas.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
          Nota
          <input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Observação opcional"
            className={`mt-1 ${inputBase} ${accent.focus}`}
          />
        </label>
        {mostraParcelas && (
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 dark:text-slate-500">
            Parcelas
            <input
              type="number"
              min={1}
              max={21}
              value={parcelas}
              onChange={(e) => setParcelas(Number(e.target.value))}
              className={`mt-1 ${inputBase} ${accent.focus}`}
            />
            {parcelas > 1 && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Serão criadas {parcelas} despesas mensais de{' '}
                {((Number(valor) / 100 || 0) / parcelas).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            )}
          </label>
        )}
        <button
          type="submit"
          disabled={submitting}
          className={`w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:cursor-wait disabled:opacity-60 ${accent.submit}`}
        >
          {submitting ? 'Salvando…' : submitLabel}
        </button>
      </form>
    </div>
  );
}
