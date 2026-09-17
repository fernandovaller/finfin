import i18n from './i18n';

export interface Receita {
  id: number;
  data: string;
  valor: number;
  categoria: string;
  origem: string;
  formaPagamento: string;
  contaId: number | null;
  nota: string;
  fitid?: string | null;
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
  fitid?: string | null;
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
  /** Access (15 min) — guardado só em memória, nunca em storage. */
  token: string;
  /** Instante ISO em que o access expira. */
  expiraEm: string;
}

/**
 * Access vive só em memória: some no F5 e volta via refresh (cookie
 * HttpOnly que o JS não lê). XSS não encontra token em storage.
 */
let accessToken: string | null = null;
/** Uma única renovação em voo — chamadas concorrentes esperam a mesma. */
let refreshEmVoo: Promise<string | null> | null = null;

export function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string): void {
  accessToken = token;
}

export function clearToken(): void {
  accessToken = null;
  refreshEmVoo = null;
}

export async function refreshAccess(): Promise<string | null> {
  if (refreshEmVoo) return refreshEmVoo;
  refreshEmVoo = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        clearToken();
        return null;
      }
      const sessao = (await res.json()) as SessaoCriada;
      accessToken = sessao.token;
      return accessToken;
    } catch {
      clearToken();
      return null;
    }
  })();
  try {
    return await refreshEmVoo;
  } finally {
    refreshEmVoo = null;
  }
}

/**
 * Rotas públicas de auth: 401 aqui é erro real (credenciais/token de e-mail),
 * nunca "sessão expirada" — não tenta refresh para não mascarar a mensagem.
 */
function rotaSemRefresh(path: string): boolean {
  return (
    path.startsWith('/api/auth/login') ||
    path.startsWith('/api/auth/cadastro') ||
    path.startsWith('/api/auth/refresh') ||
    path.startsWith('/api/auth/recuperar-senha') ||
    path.startsWith('/api/auth/redefinir-senha') ||
    path.startsWith('/api/auth/logout')
  );
}

async function lerErro(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  const msg = (body as { message?: unknown }).message;
  return Array.isArray(msg) ? msg.join('; ') : ((msg as string) ?? res.statusText);
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const semRefresh = rotaSemRefresh(path);
  const tenta = async (tentativa: number): Promise<T> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const res = await fetch(path, {
      ...init,
      credentials: 'include', // envia o cookie do refresh quando preciso
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
    });
    if (res.status === 401 && !semRefresh && tentativa === 0) {
      // Access expirado/nulo (ex.: F5 limpou a memória): renova e repete 1 vez.
      const novo = await refreshAccess();
      if (novo) return tenta(1);
      throw new Error(i18n.t('comum.sessaoExpirada'));
    }
    if (res.status === 401 && accessToken && !semRefresh) {
      clearToken();
      throw new Error(i18n.t('comum.sessaoExpirada'));
    }
    if (!res.ok) throw new Error(await lerErro(res));
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  };
  return tenta(0);
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

export function recuperarSenha(email: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>('/api/auth/recuperar-senha', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function redefinirSenha(token: string, novaSenha: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>('/api/auth/redefinir-senha', {
    method: 'POST',
    body: JSON.stringify({ token, novaSenha }),
  });
}
