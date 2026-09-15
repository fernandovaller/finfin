import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('despesas')
export class Despesa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  data: string;

  @Column('real')
  valor: number;

  @Column()
  categoria: string;

  @Column({ default: '' })
  descricao: string;

  @Column({ default: '' })
  formaPagamento: string;
}
