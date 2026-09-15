export interface Receita {
  id: number;
  data: string;
  valor: number;
  categoria: string;
  origem: string;
  formaPagamento: string;
  contaId: number | null;
  nota: string;
}

export interface Despesa {
  id: number;
  data: string;
  valor: number;
  categoria: string;
  descricao: string;
  formaPagamento: string;
  contaId: number | null;
  nota: string;
  grupoParcela?: string | null;
  parcelaAtual?: number | null;
  parcelaTotal?: number | null;
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

export interface Conta {
  id: number;
  nome: string;
  saldoInicial: number;
  nota: string;
  icone: string;
  principal: boolean;
}

export const CORES_CATEGORIA = ['sky', 'violet', 'amber', 'pink', 'emerald', 'teal', 'rose', 'slate'];

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  avatar: string | null;
}

export interface SessaoCriada {
  usuario: Usuario;
  token: string;
}

const TOKEN_KEY = 'finfin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  if (res.status === 401 && token) {
    // 401 em chamada autenticada = sessão inválida/expirada.
    // Sem token (ex.: /auth/login) o 401 é erro de credenciais — propaga a mensagem real.
    clearToken();
    throw new Error('Sessão expirada — faça login novamente');
  }
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

export function cadastro(nome: string, email: string, senha: string): Promise<SessaoCriada> {
  return api<SessaoCriada>('/api/auth/cadastro', {
    method: 'POST',
    body: JSON.stringify({ nome, email, senha }),
  });
}

export function login(email: string, senha: string): Promise<SessaoCriada> {
  return api<SessaoCriada>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  });
}

export async function logout(): Promise<void> {
  try {
    await api<void>('/api/auth/logout', { method: 'POST' });
  } finally {
    clearToken();
  }
}

export function eu(): Promise<{ usuario: Usuario | null }> {
  return api<{ usuario: Usuario | null }>('/api/auth/eu');
}

export function atualizarPerfil(dados: {
  nome: string;
  email: string;
  avatar: string | null;
}): Promise<{ usuario: Usuario }> {
  return api<{ usuario: Usuario }>('/api/auth/perfil', {
    method: 'PUT',
    body: JSON.stringify(dados),
  });
}

export function trocarSenha(senhaAtual: string, novaSenha: string): Promise<{ usuario: Usuario }> {
  return api<{ usuario: Usuario }>('/api/auth/senha', {
    method: 'PUT',
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
}
