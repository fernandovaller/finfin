import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Auditoria } from './auditoria.entity';
import { Categoria } from './categoria.entity';
import { Conta } from './conta.entity';
import { Despesa } from './despesa.entity';
import { FormaPagamento } from './forma-pagamento.entity';
import { Receita } from './receita.entity';

export interface RegistrarAuditoria {
  modulo: string;
  acao: string;
  registroId?: number | null;
  descricao?: string;
  detalhes?: unknown;
}

export interface FiltroAuditoria {
  modulo?: string;
  acao?: string;
  descricao?: string;
  dataInicio?: string;
  dataFim?: string;
  pagina?: number;
  porPagina?: number;
}

function resume(valor: string, max: number): string {
  return valor.length > max ? valor.slice(0, max) : valor;
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly auditorias: Repository<Auditoria>,
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

  /** Grava um evento. Nunca quebra o fluxo principal — falha silenciosa. */
  async registrar(usuarioId: number, evento: RegistrarAuditoria): Promise<void> {
    try {
      const detalhes =
        evento.detalhes === undefined ? null : resume(JSON.stringify(evento.detalhes), 8000);
      await this.auditorias.save({
        usuarioId,
        modulo: resume(String(evento.modulo ?? ''), 40),
        acao: resume(String(evento.acao ?? ''), 20),
        registroId: Number.isInteger(evento.registroId) ? (evento.registroId as number) : null,
        descricao: resume(String(evento.descricao ?? ''), 300),
        detalhes,
      });
    } catch {
      // Auditoria é acessória: erro aqui não pode derrubar o CRUD.
    }
  }

  /** Lista paginada com filtros — sempre escopada por usuário. */
  async listar(
    usuarioId: number,
    filtro: FiltroAuditoria,
  ): Promise<{
    itens: Auditoria[];
    total: number;
    pagina: number;
    porPagina: number;
    totalPaginas: number;
  }> {
    const pagina = Number.isInteger(filtro.pagina) && (filtro.pagina as number) > 0 ? (filtro.pagina as number) : 1;
    const porPaginaRaw = Number(filtro.porPagina) || 20;
    const porPagina = Math.min(Math.max(porPaginaRaw, 1), 100);
    const qb = this.auditorias
      .createQueryBuilder('a')
      .where('a.usuarioId = :usuarioId', { usuarioId })
      .orderBy('a.id', 'DESC');
    if (filtro.modulo) qb.andWhere('a.modulo = :modulo', { modulo: filtro.modulo });
    if (filtro.acao) qb.andWhere('a.acao = :acao', { acao: filtro.acao });
    if (filtro.descricao?.trim()) {
      qb.andWhere('a.descricao LIKE :descricao', { descricao: `%${filtro.descricao.trim()}%` });
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(filtro.dataInicio ?? '')) {
      qb.andWhere('a.criadoEm >= :inicio', { inicio: `${filtro.dataInicio} 00:00:00` });
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(filtro.dataFim ?? '')) {
      qb.andWhere('a.criadoEm <= :fim', { fim: `${filtro.dataFim} 23:59:59` });
    }
    const total = await qb.getCount();
    const itens = await qb
      .skip((pagina - 1) * porPagina)
      .take(porPagina)
      .getMany();
    return {
      itens,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
    };
  }

  /** Limpeza manual da trilha (opcionalmente só anterior a data). */
  async limpar(usuarioId: number, antesDe?: string): Promise<{ excluidas: number }> {
    const qb = this.auditorias
      .createQueryBuilder()
      .delete()
      .where('usuarioId = :usuarioId', { usuarioId });
    if (antesDe && /^\d{4}-\d{2}-\d{2}$/.test(antesDe)) {
      qb.andWhere('criadoEm < :corte', { corte: `${antesDe} 00:00:00` });
    }
    const res = await qb.execute();
    return { excluidas: res.affected ?? 0 };
  }

  /**
   * Restaura um registro excluído a partir do `antes` guardado no evento.
   * - Só eventos `excluir` com snapshot geram restauração; id novo (autoincrement).
   * - Conta: valida nome único e conta principal; lançamentos não voltam (exclusão
   *   só ocorria sem vínculo), então o id novo não quebra nada.
   * - Receita/despesa: a conta do snapshot precisa existir; senão 400.
   */
  async restaurar(usuarioId: number, eventoId: number): Promise<any> {
    const evento = await this.auditorias.findOneBy({ id: eventoId, usuarioId });
    if (!evento) throw new NotFoundException('Evento não encontrado');
    if (evento.acao !== 'excluir') {
      throw new BadRequestException('Só eventos de exclusão podem ser restaurados');
    }
    let antes: any = null;
    try {
      antes = evento.detalhes ? JSON.parse(evento.detalhes)?.antes ?? null : null;
    } catch {
      antes = null;
    }
    if (!antes || typeof antes !== 'object') {
      throw new BadRequestException('Evento sem dados para restaurar');
    }
    switch (evento.modulo) {
      case 'categorias': {
        const { nome, tipo, cor } = antes;
        if (!nome || (tipo !== 'receita' && tipo !== 'despesa')) {
          throw new BadRequestException('Dados da categoria inválidos');
        }
        try {
          const salva = await this.categorias.save({ nome, tipo, cor: cor ?? 'slate', usuarioId });
          await this.registrar(usuarioId, {
            modulo: 'categorias',
            acao: 'restaurar',
            registroId: salva.id,
            descricao: `Categoria #${salva.id} · ${salva.nome} (${salva.tipo}) — restaurada`,
            detalhes: { depois: salva, deEvento: evento.id },
          });
          return salva;
        } catch {
          throw new ConflictException('Já existe uma categoria com esse nome para esse tipo');
        }
      }
      case 'formas-pagamento': {
        const nome = antes?.nome?.trim?.();
        if (!nome) throw new BadRequestException('Dados da forma de pagamento inválidos');
        try {
          const salva = await this.formas.save({ nome, usuarioId });
          await this.registrar(usuarioId, {
            modulo: 'formas-pagamento',
            acao: 'restaurar',
            registroId: salva.id,
            descricao: `Forma #${salva.id} · ${salva.nome} — restaurada`,
            detalhes: { depois: salva, deEvento: evento.id },
          });
          return salva;
        } catch {
          throw new ConflictException('Já existe uma forma de pagamento com esse nome');
        }
      }
      case 'contas': {
        const nome = antes?.nome?.trim?.();
        if (!nome) throw new BadRequestException('Dados da conta inválidos');
        const saldoInicial = Number(antes?.saldoInicial) || 0;
        try {
          const nova = await this.contas.save({
            nome,
            saldoInicial,
            nota: typeof antes?.nota === 'string' ? antes.nota : '',
            icone: typeof antes?.icone === 'string' ? antes.icone : '',
            principal: false,
            usuarioId,
          });
          await this.registrar(usuarioId, {
            modulo: 'contas',
            acao: 'restaurar',
            registroId: nova.id,
            descricao: `Conta #${nova.id} · ${nova.nome} — restaurada`,
            detalhes: { depois: nova, deEvento: evento.id },
          });
          return nova;
        } catch {
          throw new ConflictException('Já existe uma conta com esse nome');
        }
      }
      case 'receitas':
      case 'despesas': {
        const contaId = antes?.contaId ?? null;
        if (contaId !== null && contaId !== undefined) {
          const conta = await this.contas.findOneBy({ id: contaId, usuarioId });
          if (!conta) {
            throw new BadRequestException(
              'Conta original não existe mais — restaure a conta primeiro ou o vínculo se perdeu',
            );
          }
        }
        const base = {
          data: antes.data,
          valor: antes.valor,
          categoria: antes.categoria,
          formaPagamento: antes.formaPagamento ?? '',
          contaId,
          nota: antes.nota ?? '',
          fitid: antes.fitid ?? null,
          usuarioId,
        };
        if (typeof base.data !== 'string' || typeof base.valor !== 'number' || !(base.valor > 0) || !base.categoria) {
          throw new BadRequestException('Dados do lançamento inválidos');
        }
        const salva =
          evento.modulo === 'receitas'
            ? await this.receitas.save({ ...base, origem: antes.origem ?? base.categoria })
            : await this.despesas.save({
                ...base,
                descricao: antes.descricao ?? base.categoria,
                grupoParcela: null,
                parcelaAtual: null,
                parcelaTotal: null,
              });
        await this.registrar(usuarioId, {
          modulo: evento.modulo,
          acao: 'restaurar',
          registroId: salva.id,
          descricao: `${evento.modulo === 'receitas' ? 'Receita' : 'Despesa'} #${salva.id} — restaurada`,
          detalhes: { depois: salva, deEvento: evento.id },
        });
        return salva;
      }
      default:
        throw new BadRequestException(`Módulo "${evento.modulo}" não tem restauração`);
    }
  }
}
