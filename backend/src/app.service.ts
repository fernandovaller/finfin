import { ConflictException, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { In, Repository } from 'typeorm';
import { Categoria } from './categoria.entity';
import { Conta } from './conta.entity';
import { Despesa } from './despesa.entity';
import { FormaPagamento } from './forma-pagamento.entity';
import { Receita } from './receita.entity';
import { AuditoriaService } from './auditoria.service';

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
    private readonly auditoria: AuditoriaService,
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
    const salva = await this.receitas.save({
      data: body.data,
      valor: body.valor,
      categoria: body.categoria,
      origem: body.origem,
      formaPagamento: body.formaPagamento ?? '',
      contaId,
      nota: body.nota ?? '',
      usuarioId,
    });
    await this.auditoria.registrar(usuarioId, {
      modulo: 'receitas',
      acao: 'criar',
      registroId: salva.id,
      descricao: `Receita #${salva.id} · ${salva.categoria} · R$ ${salva.valor}`,
      detalhes: { depois: salva },
    });
    return salva;
  }

  async createDespesa(usuarioId: number, body: any): Promise<Despesa | Despesa[]> {
    assertLancamento(body, ['data', 'valor', 'categoria']);
    const contaId = await this.assertConta(usuarioId, body?.contaId);
    const totalParcelas = assertParcelas(body);
    const nota = body.nota ?? '';
    if (totalParcelas === 1) {
      const salva = await this.despesas.save({
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
      await this.auditoria.registrar(usuarioId, {
        modulo: 'despesas',
        acao: 'criar',
        registroId: salva.id,
        descricao: `Despesa #${salva.id} · ${salva.descricao || salva.categoria} · R$ ${salva.valor}`,
        detalhes: { depois: salva },
      });
      return salva;
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
    return this.despesas.save(itens).then(async (salvas) => {
      const lista = Array.isArray(salvas) ? salvas : [salvas];
      await this.auditoria.registrar(usuarioId, {
        modulo: 'despesas',
        acao: 'criar',
        descricao: `Despesa parcelada ${totalParcelas}x · ${base} · R$ ${body.valor}`,
        detalhes: { depois: lista.map((d) => ({ id: d.id, data: d.data, valor: d.valor })) },
      });
      return salvas;
    });
  }

  async updateReceita(usuarioId: number, id: number, body: any): Promise<Receita> {
    assertLancamento(body, ['data', 'valor', 'categoria', 'origem']);
    const contaId = await this.assertConta(usuarioId, body?.contaId);
    const receita = await this.receitas.findOneBy({ id, usuarioId });
    if (!receita) throw new NotFoundException('Receita não encontrada');
    const antes = { ...receita };
    Object.assign(receita, {
      data: body.data,
      valor: body.valor,
      categoria: body.categoria,
      origem: body.origem,
      formaPagamento: body.formaPagamento ?? '',
      contaId,
      nota: body.nota ?? '',
    });
    const salva = await this.receitas.save(receita);
    await this.auditoria.registrar(usuarioId, {
      modulo: 'receitas',
      acao: 'atualizar',
      registroId: salva.id,
      descricao: `Receita #${salva.id} · ${salva.categoria} · R$ ${salva.valor}`,
      detalhes: { antes, depois: salva },
    });
    return salva;
  }

  async updateDespesa(usuarioId: number, id: number, body: any): Promise<Despesa> {
    assertLancamento(body, ['data', 'valor', 'categoria']);
    const contaId = await this.assertConta(usuarioId, body?.contaId);
    const despesa = await this.despesas.findOneBy({ id, usuarioId });
    if (!despesa) throw new NotFoundException('Despesa não encontrada');
    const antes = { ...despesa };
    Object.assign(despesa, {
      data: body.data,
      valor: body.valor,
      categoria: body.categoria,
      descricao: body.descricao ?? '',
      formaPagamento: body.formaPagamento ?? '',
      contaId,
      nota: body.nota ?? '',
    });
    const salva = await this.despesas.save(despesa);
    await this.auditoria.registrar(usuarioId, {
      modulo: 'despesas',
      acao: 'atualizar',
      registroId: salva.id,
      descricao: `Despesa #${salva.id} · ${salva.descricao || salva.categoria} · R$ ${salva.valor}`,
      detalhes: { antes, depois: salva },
    });
    return salva;
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
    const antes = await this.receitas.findOneBy({ id, usuarioId });
    if (!antes) throw new NotFoundException('Receita não encontrada');
    await this.receitas.delete({ id, usuarioId });
    await this.auditoria.registrar(usuarioId, {
      modulo: 'receitas',
      acao: 'excluir',
      registroId: id,
      descricao: `Receita #${id} · ${antes.categoria} · R$ ${antes.valor}`,
      detalhes: { antes },
    });
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
        await this.auditoria.registrar(usuarioId, {
          modulo: 'despesas',
          acao: 'excluir',
          registroId: id,
          descricao: `Despesa #${id} · ${despesa.descricao || despesa.categoria} · R$ ${despesa.valor}`,
          detalhes: { antes: despesa },
        });
        return { excluidas: 1 };
      }
      const res = await this.despesas.delete({ grupoParcela: despesa.grupoParcela, usuarioId });
      await this.auditoria.registrar(usuarioId, {
        modulo: 'despesas',
        acao: 'excluir',
        descricao: `Despesas parceladas (${res.affected ?? 0}x) · ${despesa.descricao || despesa.categoria}`,
        detalhes: { antes: despesa, excluidas: res.affected ?? 0 },
      });
      return { excluidas: res.affected ?? 0 };
    }
    const antes = await this.despesas.findOneBy({ id, usuarioId });
    if (!antes) throw new NotFoundException('Despesa não encontrada');
    await this.despesas.delete({ id, usuarioId });
    await this.auditoria.registrar(usuarioId, {
      modulo: 'despesas',
      acao: 'excluir',
      registroId: id,
      descricao: `Despesa #${id} · ${antes.descricao || antes.categoria} · R$ ${antes.valor}`,
      detalhes: { antes },
    });
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
    await this.auditoria.registrar(usuarioId, {
      modulo: 'dados',
      acao: 'exportar',
      descricao: `Exportação JSON · ${receitas.length} receita(s), ${despesas.length} despesa(s)`,
    });
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
      await this.auditoria.registrar(usuarioId, {
        modulo: 'dados',
        acao: 'exportar',
        descricao: `Exportação CSV · ${itens.length} receita(s)`,
      });
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
      await this.auditoria.registrar(usuarioId, {
        modulo: 'dados',
        acao: 'exportar',
        descricao: `Exportação CSV · ${itens.length} despesa(s)`,
      });
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
    const total = { receitas: r.affected ?? 0, despesas: d.affected ?? 0 };
    await this.auditoria.registrar(usuarioId, {
      modulo: 'dados',
      acao: 'apagar',
      descricao: `Apagou lançamentos · ${total.receitas} receita(s), ${total.despesas} despesa(s)`,
      detalhes: total,
    });
    return total;
  }

  /** Apaga lançamentos + contas do usuário, mantendo catálogo e perfil. */
  async apagarTudo(usuarioId: number): Promise<{ receitas: number; despesas: number; contas: number }> {
    const [r, d] = await Promise.all([
      this.receitas.delete({ usuarioId }),
      this.despesas.delete({ usuarioId }),
    ]);
    const c = await this.contas.delete({ usuarioId });
    const total = { receitas: r.affected ?? 0, despesas: d.affected ?? 0, contas: c.affected ?? 0 };
    await this.auditoria.registrar(usuarioId, {
      modulo: 'dados',
      acao: 'apagar',
      descricao: `Apagou tudo · ${total.receitas} receita(s), ${total.despesas} despesa(s), ${total.contas} conta(s)`,
      detalhes: total,
    });
    return total;
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
      const total = { receitas: nReceitas, despesas: nDespesas, ignorados };
      await this.auditoria.registrar(usuarioId, {
        modulo: 'importacao',
        acao: 'importar',
        descricao: `Importação OFX · ${nReceitas} receita(s), ${nDespesas} despesa(s), ${ignorados} ignorado(s)`,
        detalhes: total,
      });
      return total;
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
      // Mesmo teto do /importar/ofx — o limite do body não deve ser a única barreira.
      if (Array.isArray(backup[chave]) && backup[chave].length > 2000) {
        throw new BadRequestException(`Limite de 2000 itens em "backup.${chave}"`);
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
      const total = {
        modo,
        categorias: nCats,
        formasPagamento: nFormas,
        contas: nContas,
        receitas: nReceitas,
        despesas: nDespesas,
      };
      await this.auditoria.registrar(usuarioId, {
        modulo: 'importacao',
        acao: 'importar',
        descricao: `Importação backup (${modo}) · ${nReceitas} receita(s), ${nDespesas} despesa(s), ${nContas} conta(s)`,
        detalhes: total,
      });
      return total;
    });
  }

  // ================= Demonstração =================

  /** Gera 6 meses de histórico demo: toda categoria × 3 contas, valores determinísticos. */
  private static readonly DEMO_CONTAS = [
    { nome: 'Banco Demo', saldoInicial: 2000, icone: '🏦' },
    { nome: 'Carteira Demo', saldoInicial: 500, icone: '💵' },
    { nome: 'Cartão Demo', saldoInicial: 0, icone: '💳' },
  ];

  private static readonly DEMO_BASE_DESPESA: Record<string, number> = {
    Moradia: 1800,
    'Alimentação': 900,
    Transporte: 450,
    Saúde: 350,
    Educação: 600,
    'Lazer e entretenimento': 300,
    'Compras e vestuário': 500,
    'Contas e serviços': 400,
    'Dívidas e financiamentos': 700,
    'Investimentos e poupança': 500,
  };

  private static readonly DEMO_BASE_RECEITA: Record<string, number> = {
    Salário: 6500,
    Freelance: 1200,
    Outros: 350,
  };

  private static readonly DEMO_DESCRICOES: Record<string, string[]> = {
    Moradia: ['Aluguel mensal', 'Condomínio', 'Reparo hidráulico'],
    'Alimentação': ['Mercado semanal', 'Feira livre', 'Restaurante'],
    Transporte: ['Combustível', 'Bilhete metrô', 'Corrida de app'],
    Saúde: ['Consulta médica', 'Farmácia', 'Plano odontológico'],
    Educação: ['Mensalidade curso', 'Livros', 'Material escolar'],
    'Lazer e entretenimento': ['Cinema', 'Show', 'Streaming'],
    'Compras e vestuário': ['Roupas', 'Calçados', 'Eletrônicos'],
    'Contas e serviços': ['Energia elétrica', 'Internet', 'Água'],
    'Dívidas e financiamentos': ['Parcela financiamento', 'Fatura cartão', 'Empréstimo'],
    'Investimentos e poupança': ['Aporte mensal', 'Tesouro Direto', 'Reserva'],
  };

  private static readonly DEMO_ORIGENS: Record<string, string[]> = {
    Salário: ['Salário mensal', 'Salário mensal', 'Adiantamento'],
    Freelance: ['Projeto site', 'Consultoria', 'Freela design'],
    Outros: ['Venda usada', 'Reembolso', 'Prêmio'],
  };

  /** PRNG com seed fixa — a demo gera sempre os mesmos valores. */
  private static rngDemo(seed: number): () => number {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  async statusDemonstracao(
    usuarioId: number,
  ): Promise<{ existe: boolean; contas: number; receitas: number; despesas: number }> {
    const [contas, receitas, despesas] = await Promise.all([
      this.contas.countBy({ usuarioId, demo: true }),
      this.receitas.countBy({ usuarioId, demo: true }),
      this.despesas.countBy({ usuarioId, demo: true }),
    ]);
    return { existe: contas + receitas + despesas > 0, contas, receitas, despesas };
  }

  /**
   * Cria 3 contas demo + 6 meses de lançamentos (mês atual e 5 anteriores).
   * - Despesas: toda categoria de despesa × 3 contas × 6 meses.
   * - Receitas: Salário→Banco, Freelance→Carteira, Outras→Cartão (× 6 meses).
   * - 1 parcelado 3x por conta (Compras, a partir do mês mais antigo).
   * Idempotente por bloqueio: segunda chamada dá 409 (remova antes).
   */
  async gerarDemonstracao(
    usuarioId: number,
  ): Promise<{ contas: number; receitas: number; despesas: number }> {
    const status = await this.statusDemonstracao(usuarioId);
    if (status.existe) {
      throw new ConflictException('Demonstração já existe — remova antes de gerar de novo');
    }
    const cats = await this.categorias.findBy({ usuarioId });
    const nomesDesp = cats.filter((c) => c.tipo === 'despesa').map((c) => c.nome);
    const nomesRec = cats.filter((c) => c.tipo === 'receita').map((c) => c.nome);
    const catDesp =
      nomesDesp.length > 0 ? nomesDesp : Object.keys(AppService.DEMO_BASE_DESPESA);
    const catRec =
      nomesRec.length > 0 ? nomesRec : Object.keys(AppService.DEMO_BASE_RECEITA);
    const formas = (await this.formas.findBy({ usuarioId })).map((f) => f.nome);
    const formaDe = (i: number): string => (formas.length > 0 ? formas[i % formas.length] : '');

    let contas;
    try {
      contas = await this.contas.save(
        AppService.DEMO_CONTAS.map((c) => ({
          ...c,
          nota: 'Conta de demonstração',
          principal: false,
          usuarioId,
          demo: true,
        })),
      );
    } catch {
      throw new ConflictException(
        'Já existe conta com nome demo ("Banco/Carteira/Cartão Demo") — renomeie ou apague antes',
      );
    }

    // Seis meses: do 5º anterior até o atual (YYYY-MM).
    const agora = new Date();
    const meses: string[] = Array.from({ length: 6 }, (_, k) => {
      const d = new Date(Date.UTC(agora.getFullYear(), agora.getMonth() - (5 - k), 1));
      return d.toISOString().slice(0, 7);
    });
    const rng = AppService.rngDemo(42);
    const dia = (): string => String(1 + Math.floor(rng() * 28)).padStart(2, '0');
    const valor = (base: number): number => Math.round(base * (0.85 + rng() * 0.3) * 100) / 100;
    const gira = (lista: string[], i: number, alt: string): string =>
      lista.length > 0 ? lista[i % lista.length] : alt;

    const despesas: Array<Record<string, unknown>> = [];
    const receitas: Array<Record<string, unknown>> = [];
    let seq = 0;
    meses.forEach((mes) => {
      contas.forEach((conta, j) => {
        for (const cat of catDesp) {
          const base = AppService.DEMO_BASE_DESPESA[cat] ?? 300;
          const variantes = AppService.DEMO_DESCRICOES[cat] ?? [cat];
          despesas.push({
            data: `${mes}-${dia()}`,
            valor: valor(base),
            categoria: cat,
            descricao: variantes[(seq + j) % variantes.length],
            formaPagamento: formaDe(seq + j),
            contaId: conta.id,
            nota: '',
            grupoParcela: null,
            parcelaAtual: null,
            parcelaTotal: null,
            demo: true,
            usuarioId,
          });
          seq++;
        }
        // Receitas distribuídas: uma categoria por conta (gira se houver mais contas que categorias).
        const catR = catRec[j % catRec.length];
        const origens = AppService.DEMO_ORIGENS[catR] ?? [catR];
        receitas.push({
          data: `${mes}-${dia()}`,
          valor: valor(AppService.DEMO_BASE_RECEITA[catR] ?? 500),
          categoria: catR,
          origem: gira(origens, meses.indexOf(mes), catR),
          formaPagamento: formaDe(seq + j),
          contaId: conta.id,
          nota: '',
          demo: true,
          usuarioId,
        });
        seq++;
      });
    });

    // Um parcelado 3x por conta (meses 1–3 da janela), categoria Compras se existir.
    const catParcela = catDesp.includes('Compras e vestuário') ? 'Compras e vestuário' : catDesp[0];
    const totalParcela = 900;
    const centavosTotal = Math.round(totalParcela * 100);
    const baseParcela = Math.floor(centavosTotal / 3);
    const resto = centavosTotal - baseParcela * 3;
    contas.forEach((conta, j) => {
      const grupo = randomUUID();
      for (let n = 1; n <= 3; n++) {
        despesas.push({
          data: somarMeses(`${meses[0]}-10`, n - 1),
          valor: (baseParcela + (n === 3 ? resto : 0)) / 100,
          categoria: catParcela,
          descricao: `Notebook demo (${n}/3)`,
          formaPagamento: formaDe(j + n),
          contaId: conta.id,
          nota: '',
          grupoParcela: grupo,
          parcelaAtual: n,
          parcelaTotal: 3,
          demo: true,
          usuarioId,
        });
      }
    });

    await this.despesas.save(despesas as never[]);
    await this.receitas.save(receitas as never[]);
    const total = { contas: contas.length, receitas: receitas.length, despesas: despesas.length };
    await this.auditoria.registrar(usuarioId, {
      modulo: 'dados',
      acao: 'importar',
      descricao: `Demonstração gerada · ${total.receitas} receita(s), ${total.despesas} despesa(s), ${total.contas} conta(s)`,
      detalhes: total,
    });
    return total;
  }

  /** Remove só o que tem `demo = true` — dados reais intactos. */
  async removerDemonstracao(
    usuarioId: number,
  ): Promise<{ contas: number; receitas: number; despesas: number }> {
    const [r, d] = await Promise.all([
      this.receitas.delete({ usuarioId, demo: true }),
      this.despesas.delete({ usuarioId, demo: true }),
    ]);
    const c = await this.contas.delete({ usuarioId, demo: true });
    const total = {
      contas: c.affected ?? 0,
      receitas: r.affected ?? 0,
      despesas: d.affected ?? 0,
    };
    await this.auditoria.registrar(usuarioId, {
      modulo: 'dados',
      acao: 'apagar',
      descricao: `Demonstração removida · ${total.receitas} receita(s), ${total.despesas} despesa(s), ${total.contas} conta(s)`,
      detalhes: total,
    });
    return total;
  }
}
