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

  /** Conta dona do lançamento. Obrigatório (sem FK rígida; validado no service). */
  @Column({ type: 'integer', nullable: true })
  contaId: number | null;

  @Column({ default: '' })
  nota: string;

  /** Id da transação no extrato OFX (FITID) — chave anti-duplicada na importação. */
  @Column({ type: 'varchar', nullable: true })
  fitid: string | null;

  /** Dono do lançamento. Nullable para preservar base anterior ao login. */
  @Column({ type: 'integer', nullable: true })
  usuarioId: number | null;
}
