import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nome: string;

  @Column({ unique: true })
  email: string;

  @Column()
  senhaHash: string;

  /** Avatar em dataURL (data:image/...;base64,...). Null = usar iniciais. */
  @Column({ type: 'text', nullable: true })
  avatar: string | null;

  /** Chave da API do Resend (envio de e-mails, ex.: recuperação de senha). Null = não configurada. */
  @Column({ type: 'text', nullable: true })
  resendApiKey: string | null;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  criadoEm: string;
}
