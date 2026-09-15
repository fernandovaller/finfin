import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { Categoria } from './categoria.entity';
import { Conta } from './conta.entity';
import { Despesa } from './despesa.entity';
import { FormaPagamento } from './forma-pagamento.entity';
import { Receita } from './receita.entity';

function assertLancamento(body: any, campos: string[]): void {
  for (const campo of campos) {
    if (body?.[campo] === undefined || body?.[campo] === '') {
      throw new BadRequestException(`Campo obrigatório: ${campo}`);
    }
  }
  if (typeof body.valor !== 'number' || !(body.valor > 0)) {
    throw new BadRequestException('Campo "valor" deve ser um número maior que zero');
  }
}

function assertParcelas(body: any): number {
  const n = body?.parcelas ?? 1;
  if (!Number.isInteger(n) || n < 1 || n > 21) {
    throw new BadRequestException('Campo "parcelas" deve ser inteiro de 1 a 21');
  }
  return n;
}

/** Soma i meses preservando o dia (ex.: 2026-01-15 +1 → 2026-02-15). Retorna YYYY-MM-DD. */
function somarMeses(dataISO: string, meses: number): string {
  const [a, m, d] = dataISO.split('-').map(Number);
  const base = new Date(Date.UTC(a, m - 1, d));
  base.setUTCMonth(base.getUTCMonth() + meses);
  return base.toISOString().slice(0, 10);
}

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Receita)
    private readonly receitas: Repository<Receita>,
    @InjectRepository(Despesa)
    private readonly despesas: Repository<Despesa>,
    @InjectRepository(Conta)
    private readonly contas: Repository<Conta>,
    @InjectRepository(Categoria)
    private readonly categorias: Repository<Categoria>,
    @InjectRepository(FormaPagamento)
    private readonly formas: Repository<FormaPagamento>,
  ) {}

  /** Todo lançamento pertence a uma conta do próprio usuário. */
  private async assertConta(usuarioId: number, contaId: unknown): Promise<number> {
    if (!Number.isInteger(contaId)) {
      throw new BadRequestException('Campo obrigatório: contaId');
    }
    const conta = await this.contas.findOneBy({ id: contaId as number, usuarioId });
    if (!conta) throw new BadRequestException('Conta não encontrada');
    return contaId as number;
  }

  async createReceita(usuarioId: number, body: any): Promise<Receita> {
    assertLancamento(body, ['data', 'valor', 'categoria', 'origem']);
    const contaId = await this.assertConta(usuarioId, body?.contaId);
    return this.receitas.save({
      data: body.data,
      valor: body.valor,
      categoria: body.categoria,
      origem: body.origem,
      formaPagamento: body.formaPagamento ?? '',
      contaId,
      nota: body.nota ?? '',
      usuarioId,
    });
  }

  async createDespesa(usuarioId: number, body: any): Promise<Despesa | Despesa[]> {
    assertLancamento(body, ['data', 'valor', 'categoria']);
    const contaId = await this.assertConta(usuarioId, body?.contaId);
    const totalParcelas = assertParcelas(body);
    const nota = body.nota ?? '';
    if (totalParcelas === 1) {
      return this.despesas.save({
        data: body.data,
        valor: body.valor,
        categoria: body.categoria,
        descricao: body.descricao ?? '',
        formaPagamento: body.formaPagamento ?? '',
        contaId,
        nota,
        grupoParcela: null,
        parcelaAtual: null,
        parcelaTotal: null,
        usuarioId,
      });
    }
    // Parcelado: desdobra em N despesas mensais (competência = mês da parcela).
    const grupoParcela = randomUUID();
    const base = (body.descricao ?? '').trim() || body.categoria;
    const centavosTotal = Math.round(body.valor * 100);
    const baseParcela = Math.floor(centavosTotal / totalParcelas);
    const resto = centavosTotal - baseParcela * totalParcelas;
    const itens = Array.from({ length: totalParcelas }, (_, i) => {
      const n = i + 1;
      const centavos = baseParcela + (n === totalParcelas ? resto : 0);
      return {
        data: somarMeses(body.data, i),
        valor: centavos / 100,
        categoria: body.categoria,
        descricao: `${base} (${n}/${totalParcelas})`,
        formaPagamento: body.formaPagamento ?? '',
        contaId,
        nota,
        grupoParcela,
        parcelaAtual: n,
        parcelaTotal: totalParcelas,
        usuarioId,
      };
    });
    return this.despesas.save(itens);
  }

  async updateReceita(usuarioId: number, id: number, body: any): Promise<Receita> {
    assertLancamento(body, ['data', 'valor', 'categoria', 'origem']);
    const contaId = await this.assertConta(usuarioId, body?.contaId);
    const receita = await this.receitas.findOneBy({ id, usuarioId });
    if (!receita) throw new NotFoundException('Receita não encontrada');
    Object.assign(receita, {
      data: body.data,
      valor: body.valor,
      categoria: body.categoria,
      origem: body.origem,
      formaPagamento: body.formaPagamento ?? '',
      contaId,
      nota: body.nota ?? '',
    });
    return this.receitas.save(receita);
  }

  async updateDespesa(usuarioId: number, id: number, body: any): Promise<Despesa> {
    assertLancamento(body, ['data', 'valor', 'categoria']);
    const contaId = await this.assertConta(usuarioId, body?.contaId);
    const despesa = await this.despesas.findOneBy({ id, usuarioId });
    if (!despesa) throw new NotFoundException('Despesa não encontrada');
    Object.assign(despesa, {
      data: body.data,
      valor: body.valor,
      categoria: body.categoria,
      descricao: body.descricao ?? '',
      formaPagamento: body.formaPagamento ?? '',
      contaId,
      nota: body.nota ?? '',
    });
    return this.despesas.save(despesa);
  }

  listReceitas(usuarioId: number, contaId?: number): Promise<Receita[]> {
    const where =
      Number.isInteger(contaId) ? { usuarioId, contaId: contaId as number } : { usuarioId };
    return this.receitas.find({ where, order: { id: 'ASC' } });
  }

  listDespesas(usuarioId: number, contaId?: number): Promise<Despesa[]> {
    const where =
      Number.isInteger(contaId) ? { usuarioId, contaId: contaId as number } : { usuarioId };
    return this.despesas.find({ where, order: { id: 'ASC' } });
  }

  async deleteReceita(usuarioId: number, id: number): Promise<void> {
    const res = await this.receitas.delete({ id, usuarioId });
    if (!res.affected) throw new NotFoundException('Receita não encontrada');
  }

  async deleteDespesa(
    usuarioId: number,
    id: number,
    escopo?: string,
  ): Promise<{ excluidas: number }> {
    if (escopo === 'grupo') {
      const despesa = await this.despesas.findOneBy({ id, usuarioId });
      if (!despesa) throw new NotFoundException('Despesa não encontrada');
      if (!despesa.grupoParcela) {
        await this.despesas.delete({ id, usuarioId });
        return { excluidas: 1 };
      }
      const res = await this.despesas.delete({ grupoParcela: despesa.grupoParcela, usuarioId });
      return { excluidas: res.affected ?? 0 };
    }
    const res = await this.despesas.delete({ id, usuarioId });
    if (!res.affected) throw new NotFoundException('Despesa não encontrada');
    return { excluidas: 1 };
  }

  async resumo(
    usuarioId: number,
    mes?: string,
    contaId?: number,
  ): Promise<{ mes: string; totalReceitas: number; totalDespesas: number; saldo: number }> {
    const ref = mes ?? new Date().toISOString().slice(0, 7);
    const where =
      Number.isInteger(contaId) ? { usuarioId, contaId: contaId as number } : { usuarioId };
    const [receitas, despesas] = await Promise.all([
      this.receitas.findBy(where),
      this.despesas.findBy(where),
    ]);
    const totalReceitas = receitas
      .filter((r) => r.data.startsWith(ref))
      .reduce((s, r) => s + r.valor, 0);
    const totalDespesas = despesas
      .filter((d) => d.data.startsWith(ref))
      .reduce((s, d) => s + d.valor, 0);
    return { mes: ref, totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas };
  }

  /** Contagem de itens por coleção — alimenta a página de Configurações. */
  async contagem(usuarioId: number): Promise<{
    contas: number;
    receitas: number;
    despesas: number;
    categorias: number;
    formasPagamento: number;
  }> {
    const [contas, receitas, despesas, categorias, formasPagamento] = await Promise.all([
      this.contas.countBy({ usuarioId }),
      this.receitas.countBy({ usuarioId }),
      this.despesas.countBy({ usuarioId }),
      this.categorias.countBy({ usuarioId }),
      this.formas.countBy({ usuarioId }),
    ]);
    return { contas, receitas, despesas, categorias, formasPagamento };
  }

  /** Exporta tudo do usuário em JSON (contas, lançamentos e catálogo). */
  async exportar(usuarioId: number): Promise<Record<string, unknown>> {
    const [contas, receitas, despesas, categorias, formasPagamento] = await Promise.all([
      this.contas.find({ where: { usuarioId }, order: { id: 'ASC' } }),
      this.receitas.find({ where: { usuarioId }, order: { id: 'ASC' } }),
      this.despesas.find({ where: { usuarioId }, order: { id: 'ASC' } }),
      this.categorias.find({ where: { usuarioId }, order: { id: 'ASC' } }),
      this.formas.find({ where: { usuarioId }, order: { id: 'ASC' } }),
    ]);
    return {
      app: 'finfin',
      versao: 1,
      exportadoEm: new Date().toISOString(),
      contas,
      receitas,
      despesas,
      categorias,
      formasPagamento,
    };
  }

  /** Exporta receitas ou despesas em CSV (valores com ponto, datas ISO). */
  async exportarCsv(
    usuarioId: number,
    tipo: string,
  ): Promise<{ filename: string; csv: string }> {
    const esc = (v: unknown): string => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const linha = (cols: unknown[]): string => cols.map(esc).join(';');
    if (tipo === 'receitas') {
      const itens = await this.receitas.find({ where: { usuarioId }, order: { id: 'ASC' } });
      const csv = [
        linha(['id', 'data', 'valor', 'categoria', 'origem', 'formaPagamento', 'contaId', 'nota']),
        ...itens.map((r) =>
          linha([r.id, r.data, r.valor, r.categoria, r.origem, r.formaPagamento, r.contaId, r.nota]),
        ),
      ].join('\n');
      return { filename: 'finfin-receitas.csv', csv };
    }
    if (tipo === 'despesas') {
      const itens = await this.despesas.find({ where: { usuarioId }, order: { id: 'ASC' } });
      const csv = [
        linha(['id', 'data', 'valor', 'categoria', 'descricao', 'formaPagamento', 'contaId', 'nota', 'grupoParcela', 'parcelaAtual', 'parcelaTotal']),
        ...itens.map((d) =>
          linha([d.id, d.data, d.valor, d.categoria, d.descricao, d.formaPagamento, d.contaId, d.nota, d.grupoParcela, d.parcelaAtual, d.parcelaTotal]),
        ),
      ].join('\n');
      return { filename: 'finfin-despesas.csv', csv };
    }
    throw new BadRequestException('Campo "tipo" deve ser "receitas" ou "despesas"');
  }

  /** Apaga todos os lançamentos do usuário, mantendo contas e catálogo. */
  async apagarLancamentos(usuarioId: number): Promise<{ receitas: number; despesas: number }> {
    const [r, d] = await Promise.all([
      this.receitas.delete({ usuarioId }),
      this.despesas.delete({ usuarioId }),
    ]);
    return { receitas: r.affected ?? 0, despesas: d.affected ?? 0 };
  }

  /** Apaga lançamentos + contas do usuário, mantendo catálogo e perfil. */
  async apagarTudo(usuarioId: number): Promise<{ receitas: number; despesas: number; contas: number }> {
    const lanc = await this.apagarLancamentos(usuarioId);
    const c = await this.contas.delete({ usuarioId });
    return { ...lanc, contas: c.affected ?? 0 };
  }
}
