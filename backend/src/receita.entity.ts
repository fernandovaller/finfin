import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('receitas')
export class Receita {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  data: string;

  @Column('real')
  valor: number;

  @Column()
  categoria: string;

  @Column()
  origem: string;

  @Column({ default: '' })
  formaPagamento: string;
}
