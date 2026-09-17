import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { cadastro as apiCadastro, clearToken, eu, login as apiLogin, logout as apiLogout, refreshAccess, setToken, type Usuario } from './api';

interface AuthEstado {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  criarConta: (nome: string, email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  sincronizar: (usuario: Usuario) => void;
}

const AuthContext = createContext<AuthEstado | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    // A memória zera no F5 — o refresh (cookie HttpOnly) reconstrói o access.
    refreshAccess()
      .then((token) => {
        if (!ativo || !token) return null;
        return eu();
      })
      .then((r) => ativo && setUsuario(r?.usuario ?? null))
      .catch(() => ativo && setUsuario(null))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    clearToken(); // garante que 401 aqui seja erro de credenciais, não "sessão expirada"
    const sessao = await apiLogin(email, senha);
    setToken(sessao.token);
    setUsuario(sessao.usuario);
  }, []);

  const criarConta = useCallback(async (nome: string, email: string, senha: string) => {
    clearToken();
    const sessao = await apiCadastro(nome, email, senha);
    setToken(sessao.token);
    setUsuario(sessao.usuario);
  }, []);

  const sair = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      clearToken();
      setUsuario(null);
    }
  }, []);

  const sincronizar = useCallback((u: Usuario) => setUsuario(u), []);

  return (
    <AuthContext.Provider value={{ usuario, carregando, entrar, criarConta, sair, sincronizar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthEstado {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}
