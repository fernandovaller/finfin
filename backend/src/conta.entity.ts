import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('contas')
@Unique(['usuarioId', 'nome'])
export class Conta {
  @PrimaryGeneratedColumn()
  id: number;

  /** Descrição da conta (ex.: Cartão de crédito, Carteira). */
  @Column()
  nome: string;

  @Column('real', { default: 0 })
  saldoInicial: number;

  @Column({ default: '' })
  nota: string;

  @Column({ default: '' })
  icone: string;

  @Column({ default: false })
  principal: boolean;

  /** Dono da conta. */
  @Column({ type: 'integer', nullable: true })
  usuarioId: number | null;
}
