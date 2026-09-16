import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Módulos auditáveis — espelha os controllers (lançamentos, catálogo, auth, dados). */
export const MODULOS_AUDITORIA = [
  'receitas',
  'despesas',
  'contas',
  'categorias',
  'formas-pagamento',
  'auth',
  'importacao',
  'dados',
] as const;

export type ModuloAuditoria = (typeof MODULOS_AUDITORIA)[number] | string;

/** Ações auditáveis: CRUD + eventos de sessão e de massa (import/export/apagar). */
export const ACOES_AUDITORIA = [
  'criar',
  'atualizar',
  'excluir',
  'login',
  'logout',
  'importar',
  'exportar',
  'apagar',
  'restaurar',
] as const;

export type AcaoAuditoria = (typeof ACOES_AUDITORIA)[number] | string;

/** Trilha imutável: um registro por mutação, sempre escopado por usuário. Sem PUT. */
@Entity('auditorias')
export class Auditoria {
  @PrimaryGeneratedColumn()
  id: number;

  /** Dono do evento. Nullable para herdar base pré-login como os demais. */
  @Column({ type: 'integer', nullable: true })
  usuarioId: number | null;

  /** Ex.: receitas, despesas, contas, categorias, formas-pagamento, auth, importacao, dados. */
  @Column()
  modulo: string;

  /** Ex.: criar, atualizar, excluir, login, importar, exportar, apagar, restaurar. */
  @Column()
  acao: string;

  /** Id do registro afetado (quando há um só). */
  @Column({ type: 'integer', nullable: true })
  registroId: number | null;

  /** Resumo legível: ex. "Despesa #12 · Mercado · R$ 150". */
  @Column({ default: '' })
  descricao: string;

  /** JSON com antes/depois (sem senha/token). Tamanho limitado no service. */
  @Column({ type: 'text', nullable: true })
  detalhes: string | null;

  @Column({ default: () => 'CURRENT_TIMESTAMP' })
  criadoEm: string;
}
