import { useCallback, useEffect, useState } from 'react';
import { api, type Categoria, type FormaPagamento } from '../api';

/** Catálogo (categorias + formas) compartilhado entre as páginas. */
export function useCatalogo() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [c, f] = await Promise.all([
        api<Categoria[]>('/api/categorias'),
        api<FormaPagamento[]>('/api/formas-pagamento'),
      ]);
      setCategorias(c);
      setFormas(f);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const nomesPorTipo = (tipo: 'receita' | 'despesa'): string[] =>
    categorias.filter((c) => c.tipo === tipo).map((c) => c.nome);

  const corDe = (nome: string, tipo: 'receita' | 'despesa'): string =>
    categorias.find((c) => c.nome === nome && c.tipo === tipo)?.cor ?? 'slate';

  return {
    categorias,
    formas: formas.map((f) => f.nome),
    nomesPorTipo,
    corDe,
    recarregar,
    carregando,
  };
}
