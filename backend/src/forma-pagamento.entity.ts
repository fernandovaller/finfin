import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('formas_pagamento')
export class FormaPagamento {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nome: string;
}
