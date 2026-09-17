import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('sessoes')
export class Sessao {
  @PrimaryColumn()
  token: string;

  /** Dono da sessão (FK ON DELETE CASCADE: a sessão morre junto com o usuário). */
  @Column()
  usuarioId: number;

  /** ISO string; sessão inválida após este instante. */
  @Column()
  expiraEm: string;

  /**
   * access = Bearer curto (15 min, vai no header);
   * refresh = longo (7 dias, vai no cookie HttpOnly).
   * Nulo = sessão legada (era do localStorage), aceita como access até expirar.
   */
  @Column({ type: 'text', nullable: true })
  tipo: 'access' | 'refresh' | null;

  /** Access aponta para o refresh que o gerou (rotação/revogação em cascata). */
  @Column({ type: 'text', nullable: true })
  refreshToken: string | null;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  criadoEm: string;
}
