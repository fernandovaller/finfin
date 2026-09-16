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

  /** Conta dona do lançamento. FK no banco; o service valida o dono (409 se conta em uso). */
  @Column({ type: 'integer', nullable: true })
  contaId: number | null;

  @Column({ default: '' })
  nota: string;

  /** Id da transação no extrato OFX (FITID) — chave anti-duplicada na importação. */
  @Column({ type: 'varchar', nullable: true })
  fitid: string | null;

  /** Parcelamento no crédito: parcelas do mesmo grupo compartilham este id. */
  @Column({ type: 'varchar', nullable: true })
  grupoParcela: string | null;

  @Column({ type: 'integer', nullable: true })
  parcelaAtual: number | null;

  @Column({ type: 'integer', nullable: true })
  parcelaTotal: number | null;

  /** Dono do lançamento (FK no banco). Nullable para preservar base anterior ao login. */
  @Column({ type: 'integer', nullable: true })
  usuarioId: number | null;

  /** Marca lançamentos gerados pela demonstração (remoção seletiva). */
  @Column({ default: false })
  demo: boolean;
}
