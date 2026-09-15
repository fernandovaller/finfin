import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { Not, Repository } from 'typeorm';
import { Categoria, TipoCategoria } from './categoria.entity';
import { Conta } from './conta.entity';
import { Despesa } from './despesa.entity';
import { FormaPagamento } from './forma-pagamento.entity';
import { Receita } from './receita.entity';
import { Sessao } from './sessao.entity';
import { Usuario } from './usuario.entity';

const scrypt = promisify(scryptCb);

const SEED_CATEGORIAS: Array<{ nome: string; tipo: TipoCategoria; cor: string }> = [
  { nome: 'Moradia', tipo: 'despesa', cor: 'amber' },
  { nome: 'Alimentação', tipo: 'despesa', cor: 'emerald' },
  { nome: 'Transporte', tipo: 'despesa', cor: 'sky' },
  { nome: 'Saúde', tipo: 'despesa', cor: 'rose' },
  { nome: 'Educação', tipo: 'despesa', cor: 'violet' },
  { nome: 'Lazer e entretenimento', tipo: 'despesa', cor: 'pink' },
  { nome: 'Compras e vestuário', tipo: 'despesa', cor: 'teal' },
  { nome: 'Contas e serviços', tipo: 'despesa', cor: 'slate' },
  { nome: 'Dívidas e financiamentos', tipo: 'despesa', cor: 'amber' },
  { nome: 'Investimentos e poupança', tipo: 'despesa', cor: 'emerald' },
  { nome: 'Salário', tipo: 'receita', cor: 'emerald' },
  { nome: 'Freelance', tipo: 'receita', cor: 'teal' },
  { nome: 'Outros', tipo: 'receita', cor: 'slate' },
];

const SEED_FORMAS: string[] = [
  '💳 Cartão de Crédito',
  '⚡ Pix',
  '🏦 Cartão de Débito',
  '📄 Boleto Bancário',
  '💵 Dinheiro em Espécie',
  '🔄 Transferência Bancária',
  '📱 Carteiras Digitais / NFC',
];

/** Sessão válida por 7 dias. */
const SESSAO_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessaoCriada {
  usuario: UsuarioPublico;
  token: string;
}

export interface UsuarioPublico {
  id: number;
  nome: string;
  email: string;
  avatar: string | null;
}

function publico(usuario: Usuario): UsuarioPublico {
  return { id: usuario.id, nome: usuario.nome, email: usuario.email, avatar: usuario.avatar ?? null };
}

async function hashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(senha, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

async function confereSenha(senha: string, senhaHash: string): Promise<boolean> {
  const [salt, esperado] = senhaHash.split(':');
  if (!salt || !esperado) return false;
  const hash = (await scrypt(senha, salt, 64)) as Buffer;
  const a = Buffer.from(hash.toString('hex'), 'hex');
  const b = Buffer.from(esperado, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function normalizaEmail(email: unknown): string {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
    @InjectRepository(Sessao)
    private readonly sessoes: Repository<Sessao>,
    @InjectRepository(Categoria)
    private readonly categorias: Repository<Categoria>,
    @InjectRepository(FormaPagamento)
    private readonly formas: Repository<FormaPagamento>,
    @InjectRepository(Receita)
    private readonly receitas: Repository<Receita>,
    @InjectRepository(Despesa)
    private readonly despesas: Repository<Despesa>,
    @InjectRepository(Conta)
    private readonly contas: Repository<Conta>,
  ) {}

  async cadastro(body: any): Promise<SessaoCriada> {
    const nome = body?.nome?.trim();
    if (!nome) throw new BadRequestException('Campo obrigatório: nome');
    const email = normalizaEmail(body?.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Campo "email" inválido');
    }
    const senha = body?.senha;
    if (typeof senha !== 'string' || senha.length < 6) {
      throw new BadRequestException('Campo "senha" deve ter ao menos 6 caracteres');
    }
    if (await this.usuarios.findOneBy({ email })) {
      throw new ConflictException('Este e-mail já está cadastrado');
    }
    const usuario = await this.usuarios.save({
      nome,
      email,
      senhaHash: await hashSenha(senha),
    });
    await this.adotarOuSemear(usuario.id);
    return this.abrirSessao(usuario);
  }

  async login(body: any): Promise<SessaoCriada> {
    const email = normalizaEmail(body?.email);
    const senha = body?.senha;
    if (!email || typeof senha !== 'string') {
      throw new BadRequestException('Informe e-mail e senha');
    }
    const usuario = await this.usuarios.findOneBy({ email });
    if (!usuario || !(await confereSenha(senha, usuario.senhaHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    return this.abrirSessao(usuario);
  }

  async logout(token: string): Promise<void> {
    if (token) await this.sessoes.delete({ token });
  }

  /** Atualiza nome/email/avatar do dono. Avatar = dataURL de imagem ou null (remove). */
  async atualizarPerfil(usuarioId: number, body: any): Promise<{ usuario: UsuarioPublico }> {
    const usuario = await this.usuarios.findOneBy({ id: usuarioId });
    if (!usuario) throw new UnauthorizedException('Sessão inválida ou expirada — faça login');
    if (body?.nome !== undefined) {
      const nome = body.nome?.trim();
      if (!nome) throw new BadRequestException('Campo "nome" não pode ser vazio');
      usuario.nome = nome;
    }
    if (body?.email !== undefined) {
      const email = normalizaEmail(body.email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException('Campo "email" inválido');
      }
      const outro = await this.usuarios.findOneBy({ email });
      if (outro && outro.id !== usuarioId) {
        throw new ConflictException('Este e-mail já está em uso por outra conta');
      }
      usuario.email = email;
    }
    if (body?.avatar !== undefined) {
      const avatar = body.avatar;
      if (avatar !== null) {
        if (
          typeof avatar !== 'string' ||
          !/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)
        ) {
          throw new BadRequestException('Campo "avatar" deve ser uma imagem (dataURL)');
        }
        if (avatar.length > 500_000) {
          throw new BadRequestException('Avatar grande demais (máximo ~375 KB)');
        }
      }
      usuario.avatar = avatar;
    }
    return { usuario: publico(await this.usuarios.save(usuario)) };
  }

  /** Troca a senha conferindo a atual; revoga as demais sessões do usuário. */
  async trocarSenha(
    usuarioId: number,
    body: any,
    tokenAtual?: string,
  ): Promise<{ usuario: UsuarioPublico }> {
    const usuario = await this.usuarios.findOneBy({ id: usuarioId });
    if (!usuario) throw new UnauthorizedException('Sessão inválida ou expirada — faça login');
    const atual = body?.senhaAtual;
    const nova = body?.novaSenha;
    if (typeof atual !== 'string' || !(await confereSenha(atual, usuario.senhaHash))) {
      throw new UnauthorizedException('Senha atual incorreta');
    }
    if (typeof nova !== 'string' || nova.length < 6) {
      throw new BadRequestException('A nova senha deve ter ao menos 6 caracteres');
    }
    usuario.senhaHash = await hashSenha(nova);
    const salvo = await this.usuarios.save(usuario);
    // Token roubado não sobrevive à troca de senha: derruba as outras sessões
    // (a atual fica, pois quem trocou acabou de provar que sabe a senha).
    if (tokenAtual) {
      await this.sessoes.delete({ usuarioId, token: Not(tokenAtual) });
    } else {
      await this.sessoes.delete({ usuarioId });
    }
    return { usuario: publico(salvo) };
  }

  /** Resolve o dono a partir do token Bearer; null quando ausente/inválido/expirado. */
  async donoDoToken(cabecalho: string | undefined): Promise<Usuario | null> {
    const token = (cabecalho ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    const sessao = await this.sessoes.findOneBy({ token });
    if (!sessao || new Date(sessao.expiraEm).getTime() < Date.now()) {
      if (sessao) await this.sessoes.delete({ token });
      return null;
    }
    return this.usuarios.findOneBy({ id: sessao.usuarioId });
  }

  private async abrirSessao(usuario: Usuario): Promise<SessaoCriada> {
    const token = randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + SESSAO_TTL_MS).toISOString();
    await this.sessoes.save({ token, usuarioId: usuario.id, expiraEm });
    return { usuario: publico(usuario), token };
  }

  /**
   * Migração do catálogo/lançamentos da era sem login: o primeiro usuário
   * herda tudo que está órfão; os seguintes ganham um catálogo seed próprio.
   */
  private async adotarOuSemear(usuarioId: number): Promise<void> {
    const totalUsuarios = await this.usuarios.count();
    if (totalUsuarios === 1) {
      await Promise.all([
        this.categorias.createQueryBuilder().update().set({ usuarioId }).where('usuarioId IS NULL').execute(),
        this.formas.createQueryBuilder().update().set({ usuarioId }).where('usuarioId IS NULL').execute(),
        this.receitas.createQueryBuilder().update().set({ usuarioId }).where('usuarioId IS NULL').execute(),
        this.despesas.createQueryBuilder().update().set({ usuarioId }).where('usuarioId IS NULL').execute(),
        this.contas.createQueryBuilder().update().set({ usuarioId }).where('usuarioId IS NULL').execute(),
      ]);
      // Garante seed mesmo em base zerada (onModuleInit não semeia mais).
      if ((await this.categorias.countBy({ usuarioId })) === 0) {
        await this.categorias.save(SEED_CATEGORIAS.map((c) => ({ ...c, usuarioId })));
      }
      if ((await this.formas.countBy({ usuarioId })) === 0) {
        await this.formas.save(SEED_FORMAS.map((nome) => ({ nome, usuarioId })));
      }
      await this.garantirContaPadrao(usuarioId);
    } else {
      await this.categorias.save(SEED_CATEGORIAS.map((c) => ({ ...c, usuarioId })));
      await this.formas.save(SEED_FORMAS.map((nome) => ({ nome, usuarioId })));
      await this.garantirContaPadrao(usuarioId);
    }
  }

  /** Todo usuário novo começa com uma conta principal padrão. */
  private async garantirContaPadrao(usuarioId: number): Promise<void> {
    if ((await this.contas.countBy({ usuarioId })) === 0) {
      await this.contas.save({
        nome: 'Conta Principal',
        saldoInicial: 0,
        nota: '',
        icone: '💰',
        principal: true,
        usuarioId,
      });
    }
  }
}
