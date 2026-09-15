import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('sessoes')
export class Sessao {
  @PrimaryColumn()
  token: string;

  @Column()
  usuarioId: number;

  /** ISO string; sessão inválida após este instante. */
  @Column()
  expiraEm: string;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  criadoEm: string;
}
