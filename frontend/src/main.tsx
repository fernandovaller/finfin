import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
import Categorias from './pages/Categorias';
import FormasPagamento from './pages/FormasPagamento';
import Home from './pages/Home';
import Lancamentos from './pages/Lancamentos';
import Relatorios from './pages/Relatorios';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="lancamentos" element={<Lancamentos />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="formas-pagamento" element={<FormasPagamento />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
