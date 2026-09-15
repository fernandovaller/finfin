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

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  criadoEm: string;
}
