import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

export type TipoCategoria = 'receita' | 'despesa';

export const CORES_CATEGORIA = [
  'sky',
  'violet',
  'amber',
  'pink',
  'emerald',
  'teal',
  'rose',
  'slate',
] as const;

@Entity('categorias')
@Unique(['usuarioId', 'nome', 'tipo'])
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nome: string;

  @Column()
  tipo: TipoCategoria;

  @Column({ default: 'slate' })
  cor: string;

  /** Dono do item de catálogo. */
  @Column({ type: 'integer', nullable: true })
  usuarioId: number | null;
}
