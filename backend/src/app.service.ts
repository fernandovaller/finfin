import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
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
      let s = v === null || v === undefined ? '' : String(v);
      // Neutraliza fórmulas (=, +, -, @) ao abrir o CSV em Excel/LibreOffice.
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
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

  /**
   * Importa lançamentos vindos de extrato OFX (já parseados no frontend).
   * - `itens`: [{ fitid?, data YYYY-MM-DD, valor > 0, tipo receita|despesa, categoria?, descricao? }].
   * - Categoria vazia usa o padrão do tipo (categoriaReceita/categoriaDespesa).
   * - FITID repetido (já importado ou duplicado no lote) é ignorado, nunca duplicado.
   * Tudo roda em transação.
   */
  async importarOfx(
    usuarioId: number,
    body: any,
  ): Promise<{ receitas: number; despesas: number; ignorados: number }> {
    const contaId = await this.assertConta(usuarioId, body?.contaId);
    const categoriaReceita = body?.categoriaReceita?.trim?.() ?? '';
    const categoriaDespesa = body?.categoriaDespesa?.trim?.() ?? '';
    if (!categoriaReceita) throw new BadRequestException('Campo obrigatório: categoriaReceita');
    if (!categoriaDespesa) throw new BadRequestException('Campo obrigatório: categoriaDespesa');
    const formaPagamento =
      typeof body?.formaPagamento === 'string' ? body.formaPagamento : '';
    if (formaPagamento) {
      const formaOk = await this.formas.findOneBy({ usuarioId, nome: formaPagamento });
      if (!formaOk) throw new BadRequestException('Forma de pagamento não encontrada');
    }
    const itens = body?.itens;
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new BadRequestException('Nenhum lançamento para importar');
    }
    if (itens.length > 2000) {
      throw new BadRequestException('Limite de 2000 lançamentos por importação');
    }
    const norm = itens.map((it: any, i: number) => {
      const rotulo = `Lançamento #${i + 1}`;
      if (typeof it?.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(it.data)) {
        throw new BadRequestException(`${rotulo} com data inválida`);
      }
      const valor = Math.round(Number(it?.valor) * 100) / 100;
      if (!Number.isFinite(valor) || !(valor > 0)) {
        throw new BadRequestException(`${rotulo} com valor inválido`);
      }
      if (it?.tipo !== 'receita' && it?.tipo !== 'despesa') {
        throw new BadRequestException(`${rotulo} com tipo inválido`);
      }
      const padrao = it.tipo === 'receita' ? categoriaReceita : categoriaDespesa;
      const categoria =
        typeof it?.categoria === 'string' && it.categoria.trim() ? it.categoria.trim() : padrao;
      const descricao =
        typeof it?.descricao === 'string' ? it.descricao.trim().slice(0, 200) : '';
      const fitid =
        typeof it?.fitid === 'string' && it.fitid.trim()
          ? it.fitid.trim().slice(0, 100)
          : null;
      return { data: it.data, valor, tipo: it.tipo as string, categoria, descricao, fitid };
    });
    // Toda categoria usada precisa existir no catálogo com o tipo correspondente.
    const pares = new Map<string, string>();
    pares.set(`receita:${categoriaReceita}`, categoriaReceita);
    pares.set(`despesa:${categoriaDespesa}`, categoriaDespesa);
    for (const n of norm) pares.set(`${n.tipo}:${n.categoria}`, n.categoria);
    for (const [chave, nome] of pares) {
      const [tipo] = chave.split(':');
      const ok = await this.categorias.findOneBy({
        usuarioId,
        nome,
        tipo: tipo as 'receita' | 'despesa',
      });
      if (!ok) throw new BadRequestException(`Categoria "${nome}" não encontrada (${tipo})`);
    }
    return this.receitas.manager.transaction(async (tx) => {
      const fitids = [...new Set(norm.map((n) => n.fitid).filter((f): f is string => !!f))];
      const vistos = new Set<string>();
      if (fitids.length > 0) {
        const [r, d] = await Promise.all([
          tx.find(Receita, { where: { usuarioId, fitid: In(fitids) }, select: { fitid: true } }),
          tx.find(Despesa, { where: { usuarioId, fitid: In(fitids) }, select: { fitid: true } }),
        ]);
        for (const x of [...r, ...d]) if (x.fitid) vistos.add(x.fitid);
      }
      let nReceitas = 0;
      let nDespesas = 0;
      let ignorados = 0;
      for (const n of norm) {
        if (n.fitid) {
          if (vistos.has(n.fitid)) {
            ignorados++;
            continue;
          }
          vistos.add(n.fitid);
        }
        const base = {
          data: n.data,
          valor: n.valor,
          categoria: n.categoria,
          formaPagamento,
          contaId,
          nota: '',
          fitid: n.fitid,
          usuarioId,
        };
        if (n.tipo === 'receita') {
          await tx.save(Receita, { ...base, origem: n.descricao || n.categoria });
          nReceitas++;
        } else {
          await tx.save(Despesa, {
            ...base,
            descricao: n.descricao || n.categoria,
            grupoParcela: null,
            parcelaAtual: null,
            parcelaTotal: null,
          });
          nDespesas++;
        }
      }
      return { receitas: nReceitas, despesas: nDespesas, ignorados };
    });
  }

  /**
   * Importa um backup gerado pelo GET /api/exportar.
   * - `mesclar` (padrão): reaproveita catálogo/contas por nome, cria lançamentos novos.
   * - `substituir`: apaga lançamentos + contas antes e importa tudo do zero.
   * Tudo roda em transação — erro em qualquer item desfaz a importação inteira.
   */
  async importar(
    usuarioId: number,
    body: any,
  ): Promise<{
    modo: string;
    categorias: number;
    formasPagamento: number;
    contas: number;
    receitas: number;
    despesas: number;
  }> {
    const modo = body?.modo ?? 'mesclar';
    if (modo !== 'mesclar' && modo !== 'substituir') {
      throw new BadRequestException('Campo "modo" deve ser "mesclar" ou "substituir"');
    }
    const backup = body?.backup;
    if (!backup || typeof backup !== 'object') {
      throw new BadRequestException('Campo "backup" inválido — envie o JSON gerado pela exportação');
    }
    if (backup.app !== 'finfin') {
      throw new BadRequestException('Arquivo inválido — não é um backup do FinFin');
    }
    for (const chave of ['contas', 'receitas', 'despesas', 'categorias', 'formasPagamento']) {
      if (backup[chave] !== undefined && !Array.isArray(backup[chave])) {
        throw new BadRequestException(`Campo "backup.${chave}" deve ser uma lista`);
      }
    }
    return this.contas.manager.transaction(async (tx) => {
      if (modo === 'substituir') {
        await tx.delete(Despesa, { usuarioId });
        await tx.delete(Receita, { usuarioId });
        await tx.delete(Conta, { usuarioId });
      }
      let nCats = 0;
      for (const item of backup.categorias ?? []) {
        const nome = item?.nome?.trim?.();
        const tipo = item?.tipo;
        if (!nome || (tipo !== 'receita' && tipo !== 'despesa')) {
          throw new BadRequestException(`Categoria inválida no backup: ${JSON.stringify(item)?.slice(0, 80)}`);
        }
        const existe = await tx.findOneBy(Categoria, { usuarioId, nome, tipo });
        if (!existe) {
          await tx.save(Categoria, { nome, tipo, cor: item?.cor ?? 'slate', usuarioId });
          nCats++;
        }
      }
      let nFormas = 0;
      for (const item of backup.formasPagamento ?? []) {
        const nome = item?.nome?.trim?.();
        if (!nome) {
          throw new BadRequestException('Forma de pagamento inválida no backup (sem nome)');
        }
        const existe = await tx.findOneBy(FormaPagamento, { usuarioId, nome });
        if (!existe) {
          await tx.save(FormaPagamento, { nome, usuarioId });
          nFormas++;
        }
      }
      const mapaContas = new Map<number, number>();
      let nContas = 0;
      for (const item of backup.contas ?? []) {
        const nome = item?.nome?.trim?.();
        if (!nome) throw new BadRequestException('Conta inválida no backup (sem nome)');
        const existe = await tx.findOneBy(Conta, { usuarioId, nome });
        if (existe) {
          if (typeof item?.id === 'number') mapaContas.set(item.id, existe.id);
        } else {
          const saldoInicial = Number(item?.saldoInicial) || 0;
          let principal = item?.principal === true;
          if (principal && (await tx.countBy(Conta, { usuarioId, principal: true })) > 0) {
            principal = false;
          }
          const nova = await tx.save(Conta, {
            nome,
            saldoInicial,
            nota: typeof item?.nota === 'string' ? item.nota : '',
            icone: typeof item?.icone === 'string' ? item.icone : '',
            principal,
            usuarioId,
          });
          if (typeof item?.id === 'number') mapaContas.set(item.id, nova.id);
          nContas++;
        }
      }
      const contaDe = (idOrigem: unknown, i: number, kind: string): number => {
        const idNovo = typeof idOrigem === 'number' ? mapaContas.get(idOrigem) : undefined;
        if (idNovo === undefined) {
          throw new BadRequestException(
            `${kind} #${i + 1} referencia conta inexistente no backup (contaId ${String(idOrigem)})`,
          );
        }
        return idNovo;
      };
      let nReceitas = 0;
      for (const [i, item] of (backup.receitas ?? []).entries()) {
        if (!item?.data || typeof item?.valor !== 'number' || !(item.valor > 0) || !item?.categoria?.trim?.() || !item?.origem?.trim?.()) {
          throw new BadRequestException(`Receita #${i + 1} inválida no backup`);
        }
        await tx.save(Receita, {
          data: item.data,
          valor: item.valor,
          categoria: item.categoria,
          origem: item.origem,
          formaPagamento: item?.formaPagamento ?? '',
          contaId: contaDe(item?.contaId, i, 'Receita'),
          nota: item?.nota ?? '',
          usuarioId,
        });
        nReceitas++;
      }
      let nDespesas = 0;
      for (const [i, item] of (backup.despesas ?? []).entries()) {
        if (!item?.data || typeof item?.valor !== 'number' || !(item.valor > 0) || !item?.categoria?.trim?.()) {
          throw new BadRequestException(`Despesa #${i + 1} inválida no backup`);
        }
        await tx.save(Despesa, {
          data: item.data,
          valor: item.valor,
          categoria: item.categoria,
          descricao: item?.descricao ?? '',
          formaPagamento: item?.formaPagamento ?? '',
          contaId: contaDe(item?.contaId, i, 'Despesa'),
          nota: item?.nota ?? '',
          grupoParcela: item?.grupoParcela ?? null,
          parcelaAtual: item?.parcelaAtual ?? null,
          parcelaTotal: item?.parcelaTotal ?? null,
          usuarioId,
        });
        nDespesas++;
      }
      return {
        modo,
        categorias: nCats,
        formasPagamento: nFormas,
        contas: nContas,
        receitas: nReceitas,
        despesas: nDespesas,
      };
    });
  }
}
