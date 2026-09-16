import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { ProvedorAparencia } from './tema';
import Layout from './Layout';
import Auditoria from './pages/Auditoria';
import Categorias from './pages/Categorias';
import Configuracoes from './pages/Configuracoes';
import Contas from './pages/Contas';
import FormasPagamento from './pages/FormasPagamento';
import Home from './pages/Home';
import ImportarOfx from './pages/ImportarOfx';
import Lancamentos from './pages/Lancamentos';
import Login from './pages/Login';
import Perfil from './pages/Perfil';
import RecuperarSenha from './pages/RecuperarSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import Relatorios from './pages/Relatorios';
import './index.css';

function RotaProtegida({ children }: { children: React.ReactNode }) {
  const { usuario, carregando } = useAuth();
  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900">
        <p className="text-sm text-slate-400">Carregando…</p>
      </main>
    );
  }
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProvedorAparencia>
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/redefinir-senha" element={<RedefinirSenha />} />
          <Route
            element={
              <RotaProtegida>
                <Layout />
              </RotaProtegida>
            }
          >
            <Route index element={<Home />} />
            <Route path="lancamentos" element={<Lancamentos />} />
            <Route path="lancamentos/ofx" element={<ImportarOfx />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="categorias" element={<Categorias />} />
            <Route path="contas" element={<Contas />} />
            <Route path="auditoria" element={<Auditoria />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="formas-pagamento" element={<FormasPagamento />} />
            <Route path="perfil" element={<Perfil />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
    </ProvedorAparencia>
  </React.StrictMode>,
);
