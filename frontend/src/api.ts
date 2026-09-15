export interface Receita {
  id: number;
  data: string;
  valor: number;
  categoria: string;
  origem: string;
  formaPagamento: string;
}

export interface Despesa {
  id: number;
  data: string;
  valor: number;
  categoria: string;
  descricao: string;
  formaPagamento: string;
}

export interface Resumo {
  mes: string;
  totalReceitas: number;
  totalDespesas: number;
  saldo: number;
}

export interface Categoria {
  id: number;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
}

export interface FormaPagamento {
  id: number;
  nome: string;
}

export const CORES_CATEGORIA = ['sky', 'violet', 'amber', 'pink', 'emerald', 'teal', 'rose', 'slate'];

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = Array.isArray((body as { message?: unknown }).message)
      ? (body as { message: string[] }).message.join('; ')
      : ((body as { message?: string }).message ?? res.statusText);
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
