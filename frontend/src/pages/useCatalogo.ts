import { useCallback, useEffect, useState } from 'react';
import { api, type Categoria, type Conta, type FormaPagamento } from '../api';

export function useCatalogo() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [c, f, ct] = await Promise.all([
        api<Categoria[]>('/api/categorias'),
        api<FormaPagamento[]>('/api/formas-pagamento'),
        api<Conta[]>('/api/contas').catch(() => [] as Conta[]),
      ]);
      setCategorias(c);
      setFormas(f);
      setContas(ct);
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

  const contaPorId = (id: number | null | undefined): string =>
    (id != null && contas.find((c) => c.id === id)?.nome) || '';

  const contaPrincipal = contas.find((c) => c.principal) ?? null;

  return {
    categorias,
    formas: formas.map((f) => f.nome),
    formasDetalhadas: formas,
    contas,
    contaPorId,
    contaPrincipal,
    nomesPorTipo,
    corDe,
    recarregar,
    carregando,
  };
}
