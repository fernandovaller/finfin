export interface OfxItem {
  fitid: string | null;
  /** Data ISO YYYY-MM-DD extraída de DTPOSTED. */
  data: string;
  /** Valor absoluto (> 0). */
  valor: number;
  tipo: 'receita' | 'despesa';
  descricao: string;
}

function tag(bloco: string, nome: string): string {
  const m = bloco.match(new RegExp(`<${nome}>([^<\\r\\n]*)`, 'i'));
  return (m?.[1] ?? '').trim();
}

/**
 * Parseia extrato OFX (SGML, ex.: Nubank) em lançamentos.
 * - Tipo pelo sinal de TRNAMT (negativo = despesa); TRNTYPE como fallback.
 * - Descrição = MEMO (ou NAME); FITID duplicado no arquivo entra uma vez só.
 */
export function parseOfx(texto: string): OfxItem[] {
  const normalizado = texto.replace(/\r\n?/g, '\n');
  if (!normalizado.includes('<OFX>') && !normalizado.includes('<ofx>')) {
    throw new Error('Arquivo inválido — não parece ser um extrato OFX');
  }
  const blocos = normalizado.match(/<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>)/gi) ?? [];
  const itens: OfxItem[] = [];
  const fitids = new Set<string>();
  for (const bloco of blocos) {
    const dt = tag(bloco, 'DTPOSTED');
    const digitos = dt.replace(/\D/g, '');
    if (digitos.length < 8) continue;
    const data = `${digitos.slice(0, 4)}-${digitos.slice(4, 6)}-${digitos.slice(6, 8)}`;
    const bruto = Number(tag(bloco, 'TRNAMT').replace(',', '.'));
    if (!Number.isFinite(bruto) || bruto === 0) continue;
    const tipo: 'receita' | 'despesa' = bruto < 0 ? 'despesa' : 'receita';
    const valor = Math.round(Math.abs(bruto) * 100) / 100;
    const descricao = (tag(bloco, 'MEMO') || tag(bloco, 'NAME') || 'Lançamento OFX')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200);
    const fitid = tag(bloco, 'FITID') || null;
    if (fitid) {
      if (fitids.has(fitid)) continue;
      fitids.add(fitid);
    }
    itens.push({ fitid, data, valor, tipo, descricao });
  }
  if (itens.length === 0) {
    throw new Error('Nenhum lançamento encontrado no arquivo OFX');
  }
  return itens.sort((a, b) => a.data.localeCompare(b.data));
}
