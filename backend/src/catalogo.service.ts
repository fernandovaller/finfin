import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria, CORES_CATEGORIA, TipoCategoria } from './categoria.entity';
import { Despesa } from './despesa.entity';
import { FormaPagamento } from './forma-pagamento.entity';
import { Receita } from './receita.entity';

const SEED_CATEGORIAS: Array<{ nome: string; tipo: TipoCategoria; cor: string }> = [
  { nome: 'Necessidades', tipo: 'despesa', cor: 'sky' },
  { nome: 'Renda', tipo: 'despesa', cor: 'violet' },
  { nome: 'Dívidas', tipo: 'despesa', cor: 'amber' },
  { nome: 'Desejos', tipo: 'despesa', cor: 'pink' },
  { nome: 'Salário', tipo: 'receita', cor: 'emerald' },
  { nome: 'Freelance', tipo: 'receita', cor: 'teal' },
  { nome: 'Outros', tipo: 'receita', cor: 'slate' },
];

const SEED_FORMAS = ['Dinheiro', 'PIX', 'Cartão de crédito', 'Cartão de débito', 'Débito automático', 'Outro'];

function plural(n: number): string {
  return `${n} lançamento${n === 1 ? '' : 's'}`;
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
  ) {}

  /** Seed executado no boot quando as tabelas estão vazias (preserva o catálogo atual). */
  async onModuleInit(): Promise<void> {
    if ((await this.categorias.count()) === 0) {
      await this.categorias.save(SEED_CATEGORIAS);
    }
    if ((await this.formas.count()) === 0) {
      await this.formas.save(SEED_FORMAS.map((nome) => ({ nome })));
    }
  }

  listCategorias(tipo?: string): Promise<Categoria[]> {
    const where = tipo === 'receita' || tipo === 'despesa' ? { tipo: tipo as TipoCategoria } : {};
    return this.categorias.find({ where, order: { nome: 'ASC' } });
  }

  async createCategoria(body: any): Promise<Categoria> {
    const nome = body?.nome?.trim();
    if (!nome) throw new BadRequestException('Campo obrigatório: nome');
    const tipo = body?.tipo;
    if (tipo !== 'receita' && tipo !== 'despesa') {
      throw new BadRequestException('Campo "tipo" deve ser "receita" ou "despesa"');
    }
    const cor = body?.cor ?? 'slate';
    if (!(CORES_CATEGORIA as readonly string[]).includes(cor)) {
      throw new BadRequestException(`Campo "cor" deve ser uma de: ${CORES_CATEGORIA.join(', ')}`);
    }
    try {
      return await this.categorias.save({ nome, tipo, cor });
    } catch {
      throw new ConflictException('Já existe uma categoria com esse nome para esse tipo');
    }
  }

  async updateCategoria(id: number, body: any): Promise<Categoria> {
    const categoria = await this.categorias.findOneBy({ id });
    if (!categoria) throw new NotFoundException('Categoria não encontrada');
    if (body?.nome !== undefined) {
      if (!body.nome.trim()) throw new BadRequestException('Campo "nome" não pode ser vazio');
      categoria.nome = body.nome.trim();
    }
    if (body?.cor !== undefined) {
      if (!(CORES_CATEGORIA as readonly string[]).includes(body.cor)) {
        throw new BadRequestException(`Campo "cor" deve ser uma de: ${CORES_CATEGORIA.join(', ')}`);
      }
      categoria.cor = body.cor;
    }
    try {
      return await this.categorias.save(categoria);
    } catch {
      throw new ConflictException('Já existe uma categoria com esse nome para esse tipo');
    }
  }

  async deleteCategoria(id: number): Promise<void> {
    const categoria = await this.categorias.findOneBy({ id });
    if (!categoria) throw new NotFoundException('Categoria não encontrada');
    const repo = categoria.tipo === 'receita' ? this.receitas : this.despesas;
    const emUso = await repo.countBy({ categoria: categoria.nome });
    if (emUso > 0) {
      throw new ConflictException(
        `Categoria em uso em ${plural(emUso)} — não pode ser excluída`,
      );
    }
    await this.categorias.delete(id);
  }

  listFormas(): Promise<FormaPagamento[]> {
    return this.formas.find({ order: { nome: 'ASC' } });
  }

  async createForma(body: any): Promise<FormaPagamento> {
    const nome = body?.nome?.trim();
    if (!nome) throw new BadRequestException('Campo obrigatório: nome');
    try {
      return await this.formas.save({ nome });
    } catch {
      throw new ConflictException('Já existe uma forma de pagamento com esse nome');
    }
  }

  async updateForma(id: number, body: any): Promise<FormaPagamento> {
    const forma = await this.formas.findOneBy({ id });
    if (!forma) throw new NotFoundException('Forma de pagamento não encontrada');
    if (body?.nome !== undefined) {
      if (!body.nome.trim()) throw new BadRequestException('Campo "nome" não pode ser vazio');
      forma.nome = body.nome.trim();
    }
    try {
      return await this.formas.save(forma);
    } catch {
      throw new ConflictException('Já existe uma forma de pagamento com esse nome');
    }
  }

  async deleteForma(id: number): Promise<void> {
    const forma = await this.formas.findOneBy({ id });
    if (!forma) throw new NotFoundException('Forma de pagamento não encontrada');
    const [emReceitas, emDespesas] = await Promise.all([
      this.receitas.countBy({ formaPagamento: forma.nome }),
      this.despesas.countBy({ formaPagamento: forma.nome }),
    ]);
    const emUso = emReceitas + emDespesas;
    if (emUso > 0) {
      throw new ConflictException(
        `Forma de pagamento em uso em ${plural(emUso)} — não pode ser excluída`,
      );
    }
    await this.formas.delete(id);
  }
}
