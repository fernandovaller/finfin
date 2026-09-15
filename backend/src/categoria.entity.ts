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
@Unique(['nome', 'tipo'])
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nome: string;

  @Column()
  tipo: TipoCategoria;

  @Column({ default: 'slate' })
  cor: string;
}
