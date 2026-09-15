import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('formas_pagamento')
@Unique(['usuarioId', 'nome'])
export class FormaPagamento {
  @PrimaryGeneratedColumn()
  id: number;

  /** Texto simples (ex.: PIX, Crédito à vista). Sem tipo, sem vínculo. */
  @Column()
  nome: string;

  /** Dono do item de catálogo (FK no banco). Nullable preserva base anterior ao login. */
  @Column({ type: 'integer', nullable: true })
  usuarioId: number | null;
}
