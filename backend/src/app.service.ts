import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Despesa } from './despesa.entity';
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

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Receita)
    private readonly receitas: Repository<Receita>,
    @InjectRepository(Despesa)
    private readonly despesas: Repository<Despesa>,
  ) {}

  async createReceita(body: any): Promise<Receita> {
    assertLancamento(body, ['data', 'valor', 'categoria', 'origem']);
    return this.receitas.save({
      data: body.data,
      valor: body.valor,
      categoria: body.categoria,
      origem: body.origem,
      formaPagamento: body.formaPagamento ?? '',
    });
  }

  async createDespesa(body: any): Promise<Despesa> {
    assertLancamento(body, ['data', 'valor', 'categoria']);
    return this.despesas.save({
      data: body.data,
      valor: body.valor,
      categoria: body.categoria,
      descricao: body.descricao ?? '',
      formaPagamento: body.formaPagamento ?? '',
    });
  }

  async updateReceita(id: number, body: any): Promise<Receita> {
    assertLancamento(body, ['data', 'valor', 'categoria', 'origem']);
    const receita = await this.receitas.findOneBy({ id });
    if (!receita) throw new NotFoundException('Receita não encontrada');
    Object.assign(receita, {
      data: body.data,
      valor: body.valor,
      categoria: body.categoria,
      origem: body.origem,
      formaPagamento: body.formaPagamento ?? '',
    });
    return this.receitas.save(receita);
  }

  async updateDespesa(id: number, body: any): Promise<Despesa> {
    assertLancamento(body, ['data', 'valor', 'categoria']);
    const despesa = await this.despesas.findOneBy({ id });
    if (!despesa) throw new NotFoundException('Despesa não encontrada');
    Object.assign(despesa, {
      data: body.data,
      valor: body.valor,
      categoria: body.categoria,
      descricao: body.descricao ?? '',
      formaPagamento: body.formaPagamento ?? '',
    });
    return this.despesas.save(despesa);
  }

  listReceitas(): Promise<Receita[]> {
    return this.receitas.find({ order: { id: 'ASC' } });
  }

  listDespesas(): Promise<Despesa[]> {
    return this.despesas.find({ order: { id: 'ASC' } });
  }

  async deleteReceita(id: number): Promise<void> {
    const res = await this.receitas.delete(id);
    if (!res.affected) throw new NotFoundException('Receita não encontrada');
  }

  async deleteDespesa(id: number): Promise<void> {
    const res = await this.despesas.delete(id);
    if (!res.affected) throw new NotFoundException('Despesa não encontrada');
  }

  async resumo(
    mes?: string,
  ): Promise<{ mes: string; totalReceitas: number; totalDespesas: number; saldo: number }> {
    const ref = mes ?? new Date().toISOString().slice(0, 7);
    const [receitas, despesas] = await Promise.all([this.receitas.find(), this.despesas.find()]);
    const totalReceitas = receitas
      .filter((r) => r.data.startsWith(ref))
      .reduce((s, r) => s + r.valor, 0);
    const totalDespesas = despesas
      .filter((d) => d.data.startsWith(ref))
      .reduce((s, d) => s + d.valor, 0);
    return { mes: ref, totalReceitas, totalDespesas, saldo: totalReceitas - totalDespesas };
  }
}
