import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria, CORES_CATEGORIA, TipoCategoria } from './categoria.entity';
import { Conta } from './conta.entity';
import { Despesa } from './despesa.entity';
import {
  CreateCategoriaDto,
  CreateContaDto,
  CreateFormaDto,
  UpdateCategoriaDto,
  UpdateContaDto,
  UpdateFormaDto,
} from './dto/catalogo.dto';
import { FormaPagamento } from './forma-pagamento.entity';
import { Receita } from './receita.entity';
import { AuditoriaService } from './auditoria.service';

const SEED_CATEGORIAS: Array<{ nome: string; tipo: TipoCategoria; cor: string }> = [
  { nome: 'Moradia', tipo: 'despesa', cor: 'amber' },
  { nome: 'Alimentação', tipo: 'despesa', cor: 'emerald' },
  { nome: 'Transporte', tipo: 'despesa', cor: 'sky' },
  { nome: 'Saúde', tipo: 'despesa', cor: 'rose' },
  { nome: 'Educação', tipo: 'despesa', cor: 'violet' },
  { nome: 'Lazer e entretenimento', tipo: 'despesa', cor: 'pink' },
  { nome: 'Compras e vestuário', tipo: 'despesa', cor: 'teal' },
  { nome: 'Contas e serviços', tipo: 'despesa', cor: 'slate' },
  { nome: 'Dívidas e financiamentos', tipo: 'despesa', cor: 'amber' },
  { nome: 'Investimentos e poupança', tipo: 'despesa', cor: 'emerald' },
  { nome: 'Salário', tipo: 'receita', cor: 'emerald' },
  { nome: 'Freelance', tipo: 'receita', cor: 'teal' },
  { nome: 'Outros', tipo: 'receita', cor: 'slate' },
];

const SEED_FORMAS: string[] = [
  '💳 Cartão de Crédito',
  '⚡ Pix',
  '🏦 Cartão de Débito',
  '📄 Boleto Bancário',
  '💵 Dinheiro em Espécie',
  '🔄 Transferência Bancária',
  '📱 Carteiras Digitais / NFC',
];

function plural(n: number): string {
  return `${n} lançamento${n === 1 ? '' : 's'}`;
}

function nomeValido(valor: unknown, campo: string, max = 120): string {
  const nome = typeof valor === 'string' ? valor.trim() : '';
  if (!nome) throw new BadRequestException(`Campo obrigatório: ${campo}`);
  if (nome.length > max) {
    throw new BadRequestException(`Campo "${campo}" grande demais (máximo ${max} caracteres)`);
  }
  return nome;
}

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(Categoria)
    private readonly categorias: Repository<Categoria>,
    @InjectRepository(FormaPagamento)
    private readonly formas: Repository<FormaPagamento>,
    @InjectRepository(Receita)
    private readonly receitas: Repository<Receita>,
    @InjectRepository(Despesa)
    private readonly despesas: Repository<Despesa>,
    @InjectRepository(Conta)
    private readonly contas: Repository<Conta>,
    private readonly auditoria: AuditoriaService,
  ) {}

  listCategorias(usuarioId: number, tipo?: string): Promise<Categoria[]> {
    const where =
      tipo === 'receita' || tipo === 'despesa'
        ? { usuarioId, tipo: tipo as TipoCategoria }
        : { usuarioId };
    return this.categorias.find({ where, order: { nome: 'ASC' } });
  }

  async createCategoria(usuarioId: number, body: CreateCategoriaDto): Promise<Categoria> {
    const nome = nomeValido(body?.nome, 'nome');
    const tipo = body?.tipo;
    if (tipo !== 'receita' && tipo !== 'despesa') {
      throw new BadRequestException('Campo "tipo" deve ser "receita" ou "despesa"');
    }
    const cor = body?.cor ?? 'slate';
    if (!(CORES_CATEGORIA as readonly string[]).includes(cor)) {
      throw new BadRequestException(`Campo "cor" deve ser uma de: ${CORES_CATEGORIA.join(', ')}`);
    }
    try {
      const salva = await this.categorias.save({ nome, tipo, cor, usuarioId });
      await this.auditoria.registrar(usuarioId, {
        modulo: 'categorias',
        acao: 'criar',
        registroId: salva.id,
        descricao: `Categoria #${salva.id} · ${salva.nome} (${salva.tipo})`,
        detalhes: { depois: salva },
      });
      return salva;
    } catch {
      throw new ConflictException('Já existe uma categoria com esse nome para esse tipo');
    }
  }

  async updateCategoria(usuarioId: number, id: number, body: UpdateCategoriaDto): Promise<Categoria> {
    const categoria = await this.categorias.findOneBy({ id, usuarioId });
    if (!categoria) throw new NotFoundException('Categoria não encontrada');
    const nomeAntigo = categoria.nome;
    const antes = { ...categoria };
    if (body?.nome !== undefined) {
      categoria.nome = nomeValido(body.nome, 'nome');
    }
    if (body?.cor !== undefined) {
      if (!(CORES_CATEGORIA as readonly string[]).includes(body.cor)) {
        throw new BadRequestException(`Campo "cor" deve ser uma de: ${CORES_CATEGORIA.join(', ')}`);
      }
      categoria.cor = body.cor;
    }
    try {
      const salva = await this.categorias.save(categoria);
      // Lançamentos guardam a categoria como texto: renomear propaga para os do dono.
      if (salva.nome !== nomeAntigo) {
        const repo = salva.tipo === 'receita' ? this.receitas : this.despesas;
        await repo
          .createQueryBuilder()
          .update()
          .set({ categoria: salva.nome })
          .where('usuarioId = :usuarioId AND categoria = :antigo', {
            usuarioId,
            antigo: nomeAntigo,
          })
          .execute();
      }
      await this.auditoria.registrar(usuarioId, {
        modulo: 'categorias',
        acao: 'atualizar',
        registroId: salva.id,
        descricao: `Categoria #${salva.id} · ${salva.nome} (${salva.tipo})`,
        detalhes: { antes, depois: salva },
      });
      return salva;
    } catch {
      throw new ConflictException('Já existe uma categoria com esse nome para esse tipo');
    }
  }

  async deleteCategoria(usuarioId: number, id: number): Promise<void> {
    const categoria = await this.categorias.findOneBy({ id, usuarioId });
    if (!categoria) throw new NotFoundException('Categoria não encontrada');
    const repo = categoria.tipo === 'receita' ? this.receitas : this.despesas;
    const emUso = await repo.countBy({ categoria: categoria.nome, usuarioId });
    if (emUso > 0) {
      throw new ConflictException(
        `Categoria em uso em ${plural(emUso)} — não pode ser excluída`,
      );
    }
    await this.categorias.delete({ id, usuarioId });
    await this.auditoria.registrar(usuarioId, {
      modulo: 'categorias',
      acao: 'excluir',
      registroId: id,
      descricao: `Categoria #${id} · ${categoria.nome} (${categoria.tipo})`,
      detalhes: { antes: categoria },
    });
  }

  listFormas(usuarioId: number): Promise<FormaPagamento[]> {
    return this.formas.find({ where: { usuarioId }, order: { nome: 'ASC' } });
  }

  async createForma(usuarioId: number, body: CreateFormaDto): Promise<FormaPagamento> {
    const nome = nomeValido(body?.nome, 'nome');
    try {
      const salva = await this.formas.save({ nome, usuarioId });
      await this.auditoria.registrar(usuarioId, {
        modulo: 'formas-pagamento',
        acao: 'criar',
        registroId: salva.id,
        descricao: `Forma #${salva.id} · ${salva.nome}`,
        detalhes: { depois: salva },
      });
      return salva;
    } catch {
      throw new ConflictException('Já existe uma forma de pagamento com esse nome');
    }
  }

  async updateForma(usuarioId: number, id: number, body: UpdateFormaDto): Promise<FormaPagamento> {
    const forma = await this.formas.findOneBy({ id, usuarioId });
    if (!forma) throw new NotFoundException('Forma de pagamento não encontrada');
    const nomeAntigo = forma.nome;
    const antes = { ...forma };
    if (body?.nome !== undefined) {
      forma.nome = nomeValido(body.nome, 'nome');
    }
    try {
      const salva = await this.formas.save(forma);
      // Lançamentos guardam a forma como texto: renomear propaga para os do dono
      // (receitas e despesas).
      if (salva.nome !== nomeAntigo) {
        const condicao = 'usuarioId = :usuarioId AND formaPagamento = :antigo';
        const params = { usuarioId, antigo: nomeAntigo };
        await Promise.all([
          this.receitas
            .createQueryBuilder()
            .update()
            .set({ formaPagamento: salva.nome })
            .where(condicao, params)
            .execute(),
          this.despesas
            .createQueryBuilder()
            .update()
            .set({ formaPagamento: salva.nome })
            .where(condicao, params)
            .execute(),
        ]);
      }
      await this.auditoria.registrar(usuarioId, {
        modulo: 'formas-pagamento',
        acao: 'atualizar',
        registroId: salva.id,
        descricao: `Forma #${salva.id} · ${salva.nome}`,
        detalhes: { antes, depois: salva },
      });
      return salva;
    } catch {
      throw new ConflictException('Já existe uma forma de pagamento com esse nome');
    }
  }

  async deleteForma(usuarioId: number, id: number): Promise<void> {
    const forma = await this.formas.findOneBy({ id, usuarioId });
    if (!forma) throw new NotFoundException('Forma de pagamento não encontrada');
    const [emReceitas, emDespesas] = await Promise.all([
      this.receitas.countBy({ formaPagamento: forma.nome, usuarioId }),
      this.despesas.countBy({ formaPagamento: forma.nome, usuarioId }),
    ]);
    const emUso = emReceitas + emDespesas;
    if (emUso > 0) {
      throw new ConflictException(
        `Forma de pagamento em uso em ${plural(emUso)} — não pode ser excluída`,
      );
    }
    await this.formas.delete({ id, usuarioId });
    await this.auditoria.registrar(usuarioId, {
      modulo: 'formas-pagamento',
      acao: 'excluir',
      registroId: id,
      descricao: `Forma #${id} · ${forma.nome}`,
      detalhes: { antes: forma },
    });
  }

  listContas(usuarioId: number): Promise<Conta[]> {
    return this.contas.find({ where: { usuarioId }, order: { nome: 'ASC' } });
  }

  async createConta(usuarioId: number, body: CreateContaDto): Promise<Conta> {
    const nome = nomeValido(body?.nome, 'nome');
    const saldoInicial = body?.saldoInicial ?? 0;
    if (typeof saldoInicial !== 'number' || !Number.isFinite(saldoInicial)) {
      throw new BadRequestException('Campo "saldoInicial" deve ser um número');
    }
    if (Math.abs(saldoInicial) > 1_000_000_000_000) {
      throw new BadRequestException('Campo "saldoInicial" grande demais');
    }
    const nota = typeof body?.nota === 'string' ? body.nota.slice(0, 2000) : '';
    const icone = typeof body?.icone === 'string' ? body.icone.slice(0, 20) : '';
    const principal = body?.principal === true;
    try {
      const conta = await this.contas.save({ nome, saldoInicial, nota, icone, principal, usuarioId });
      if (principal) await this.marcarPrincipal(usuarioId, conta.id);
      const salva = await this.contas.findOneByOrFail({ id: conta.id, usuarioId });
      await this.auditoria.registrar(usuarioId, {
        modulo: 'contas',
        acao: 'criar',
        registroId: salva.id,
        descricao: `Conta #${salva.id} · ${salva.nome}`,
        detalhes: { depois: salva },
      });
      return salva;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ConflictException('Já existe uma conta com esse nome');
    }
  }

  async updateConta(usuarioId: number, id: number, body: UpdateContaDto): Promise<Conta> {
    const conta = await this.contas.findOneBy({ id, usuarioId });
    if (!conta) throw new NotFoundException('Conta não encontrada');
    const antes = { ...conta };
    if (body?.nome !== undefined) {
      conta.nome = nomeValido(body.nome, 'nome');
    }
    if (body?.saldoInicial !== undefined) {
      if (typeof body.saldoInicial !== 'number' || !Number.isFinite(body.saldoInicial)) {
        throw new BadRequestException('Campo "saldoInicial" deve ser um número');
      }
      if (Math.abs(body.saldoInicial) > 1_000_000_000_000) {
        throw new BadRequestException('Campo "saldoInicial" grande demais');
      }
      conta.saldoInicial = body.saldoInicial;
    }
    if (body?.nota !== undefined) {
      if (typeof body.nota !== 'string') throw new BadRequestException('Campo "nota" inválido');
      if (body.nota.length > 2000) throw new BadRequestException('Campo "nota" grande demais (máximo 2000 caracteres)');
      conta.nota = body.nota;
    }
    if (body?.icone !== undefined) {
      if (typeof body.icone !== 'string') throw new BadRequestException('Campo "icone" inválido');
      if (body.icone.length > 20) throw new BadRequestException('Campo "icone" grande demais (máximo 20 caracteres)');
      conta.icone = body.icone;
    }
    if (body?.principal !== undefined) conta.principal = body.principal === true;
    try {
      const salva = await this.contas.save(conta);
      if (salva.principal) await this.marcarPrincipal(usuarioId, salva.id);
      const final = await this.contas.findOneByOrFail({ id: salva.id, usuarioId });
      await this.auditoria.registrar(usuarioId, {
        modulo: 'contas',
        acao: 'atualizar',
        registroId: final.id,
        descricao: `Conta #${final.id} · ${final.nome}`,
        detalhes: { antes, depois: final },
      });
      return final;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new ConflictException('Já existe uma conta com esse nome');
    }
  }

  private async marcarPrincipal(usuarioId: number, id: number): Promise<void> {
    await this.contas
      .createQueryBuilder()
      .update()
      .set({ principal: false })
      .where('usuarioId = :usuarioId AND id != :id', { usuarioId, id })
      .execute();
  }

  async deleteConta(usuarioId: number, id: number): Promise<void> {
    const conta = await this.contas.findOneBy({ id, usuarioId });
    if (!conta) throw new NotFoundException('Conta não encontrada');
    const [emReceitas, emDespesas] = await Promise.all([
      this.receitas.countBy({ contaId: id, usuarioId }),
      this.despesas.countBy({ contaId: id, usuarioId }),
    ]);
    const emUso = emReceitas + emDespesas;
    if (emUso > 0) {
      throw new ConflictException(
        `Conta em uso em ${plural(emUso)} — não pode ser excluída`,
      );
    }
    await this.contas.delete({ id, usuarioId });
    await this.auditoria.registrar(usuarioId, {
      modulo: 'contas',
      acao: 'excluir',
      registroId: id,
      descricao: `Conta #${id} · ${conta.nome}`,
      detalhes: { antes: conta },
    });
  }

  /**
   * Restaura itens padrão do catálogo que faltam (ex.: após exclusões),
   * sem duplicar o que já existe.
   */
  async restaurarPadrao(usuarioId: number): Promise<{ categorias: number; formas: number }> {
    const [cats, formas] = await Promise.all([
      this.categorias.findBy({ usuarioId }),
      this.formas.findBy({ usuarioId }),
    ]);
    const temCat = new Set(cats.map((c) => `${c.tipo}:${c.nome}`));
    const novasCats = SEED_CATEGORIAS.filter((s) => !temCat.has(`${s.tipo}:${s.nome}`));
    const temForma = new Set(formas.map((f) => f.nome));
    const novasFormas = SEED_FORMAS.filter((nome) => !temForma.has(nome));
    if (novasCats.length > 0) {
      await this.categorias.save(novasCats.map((c) => ({ ...c, usuarioId })));
    }
    if (novasFormas.length > 0) {
      await this.formas.save(novasFormas.map((nome) => ({ nome, usuarioId })));
    }
    const total = { categorias: novasCats.length, formas: novasFormas.length };
    if (total.categorias + total.formas > 0) {
      await this.auditoria.registrar(usuarioId, {
        modulo: 'dados',
        acao: 'restaurar',
        descricao: `Restaurado padrão · ${total.categorias} categoria(s), ${total.formas} forma(s)`,
        detalhes: total,
      });
    }
    return total;
  }
}
