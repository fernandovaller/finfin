import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('recuperacoes_senha')
export class RecuperacaoSenha {
  @PrimaryGeneratedColumn()
  id: number;

  /** Dono do pedido (sem ON DELETE na era synchronize; a migration declara a FK). */
  @Column()
  usuarioId: number;

  /** SHA-256 hex do token enviado por e-mail — o token puro nunca é persistido. */
  @Column({ unique: true })
  tokenHash: string;

  /** ISO string; pedido inválido após este instante. */
  @Column()
  expiraEm: string;

  /** ISO string do uso; null = ainda válido (uso único). */
  @Column({ type: 'varchar', nullable: true })
  usadoEm: string | null;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  criadoEm: string;
}
