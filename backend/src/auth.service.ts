import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { Resend } from 'resend';
import { promisify } from 'util';
import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { Categoria, TipoCategoria } from './categoria.entity';
import { Conta } from './conta.entity';
import { Despesa } from './despesa.entity';
import { FormaPagamento } from './forma-pagamento.entity';
import { Receita } from './receita.entity';
import { RecuperacaoSenha } from './recuperacao-senha.entity';
import { Sessao } from './sessao.entity';
import { Usuario } from './usuario.entity';
import { AuditoriaService } from './auditoria.service';
import {
  AtualizarPerfilDto,
  CadastroDto,
  LoginDto,
  RecuperarSenhaDto,
  RedefinirSenhaDto,
  SalvarIntegracoesDto,
  TrocarSenhaDto,
} from './dto/auth.dto';

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

/** Access (Bearer, só em memória no frontend) vale 15 minutos. */
const ACCESS_TTL_MS = 15 * 60 * 1000;

/** Refresh (cookie HttpOnly) vale 7 dias e é rotacionado a cada uso. */
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Link de recuperação vale por 1 hora e só pode ser usado uma vez. */
const RECUPERACAO_TTL_MS = 60 * 60 * 1000;

export interface SessaoCriada {
  usuario: UsuarioPublico;
  /** Access token (15 min) — frontend guarda só em memória. */
  token: string;
  /** Instante ISO em que o access expira (para o frontend agendar refresh). */
  expiraEm: string;
  /** Refresh token (7 dias) — vai para cookie HttpOnly, nunca para o JS. */
  refreshToken: string;
}

export interface UsuarioPublico {
  id: number;
  nome: string;
  email: string;
  avatar: string | null;
}

export interface StatusIntegracoes {
  email: {
    /** Há chave efetiva (da conta ou do servidor via RESEND_API_KEY). */
    configurado: boolean;
    /** De onde vem a chave efetiva. */
    origem: 'conta' | 'ambiente' | null;
    /** Últimos 4 caracteres da chave efetiva (nunca a chave inteira). */
    mascarada: string | null;
  };
}

/** Últimos 4 caracteres visíveis — o bastante para reconhecer, pouco para vazar. */
function mascararChave(chave: string): string {
  const limpa = chave.trim();
  return limpa.length <= 8 ? '••••' : `${limpa.slice(0, 3)}…${limpa.slice(-4)}`;
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

function escapeHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

/** Base do link enviado por e-mail (HashRouter: tudo após `#/` é rota do frontend). */
function urlFrontend(): string {
  const direta = process.env.FRONTEND_URL?.trim().replace(/\/+$/, '');
  if (direta) return direta;
  const porta = Number(process.env.FRONTEND_PORT ?? 3000) || 3000;
  return `http://localhost:${porta}`;
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
    @InjectRepository(RecuperacaoSenha)
    private readonly recuperacoes: Repository<RecuperacaoSenha>,
    private readonly auditoria: AuditoriaService,
    @InjectDataSource()
    private readonly data: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.sessoes.delete({ expiraEm: LessThan(new Date().toISOString()) });
  }

  async cadastro(body: CadastroDto): Promise<SessaoCriada> {
    // Forma/tamanho já validados pelo DTO; aqui só regra de negócio.
    const nome = body.nome.trim();
    const email = normalizaEmail(body.email);
    const senha = body.senha;
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

  async login(body: LoginDto): Promise<SessaoCriada> {
    const email = normalizaEmail(body.email);
    const senha = body.senha;
    const usuario = await this.usuarios.findOneBy({ email });
    if (!usuario || !(await confereSenha(senha, usuario.senhaHash))) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    const sessao = await this.abrirSessao(usuario);
    await this.auditoria.registrar(usuario.id, {
      modulo: 'auth',
      acao: 'login',
      descricao: `Login · ${usuario.email}`,
    });
    return sessao;
  }

  async logout(accessToken?: string, refreshToken?: string): Promise<void> {
    if (!accessToken && !refreshToken) return;
    let usuarioId: number | null = null;
    if (accessToken) {
      const sessao = await this.sessoes.findOneBy({ token: accessToken });
      if (sessao) {
        usuarioId = sessao.usuarioId;
        await this.sessoes.delete({ token: accessToken });
      }
    }
    if (refreshToken) {
      const refresh = await this.sessoes.findOneBy({ token: refreshToken });
      if (refresh) {
        usuarioId ??= refresh.usuarioId;
        await this.sessoes.delete({ refreshToken });
        await this.sessoes.delete({ token: refreshToken });
      }
    }
    if (usuarioId !== null) {
      await this.auditoria.registrar(usuarioId, {
        modulo: 'auth',
        acao: 'logout',
        descricao: 'Logout',
      });
    }
  }

  /**
   * Troca o refresh (cookie HttpOnly) por um par novo. Consumo atômico em
   * transação: valida, deleta o refresh antigo (+ seus access) e emite o par
   * novo no mesmo commit — duas chamadas concorrentes com o mesmo refresh
   * não geram dois pares (a segunda vê `affected: 0` e cai em 401).
   */
  async refreshSessao(refreshToken: string): Promise<SessaoCriada> {
    const atual = refreshToken?.trim();
    if (!atual) throw new UnauthorizedException('Sessão inválida ou expirada — faça login');
    return this.data.transaction(async (manager) => {
      const sessoes = manager.getRepository(Sessao);
      const usuarios = manager.getRepository(Usuario);
      const refresh = await sessoes.findOneBy({ token: atual });
      if (!refresh || (refresh.tipo !== null && refresh.tipo !== 'refresh')) {
        throw new UnauthorizedException('Sessão inválida ou expirada — faça login');
      }
      if (new Date(refresh.expiraEm).getTime() < Date.now()) {
        await sessoes.delete({ refreshToken: atual });
        await sessoes.delete({ token: atual });
        throw new UnauthorizedException('Sessão inválida ou expirada — faça login');
      }
      const usuario = await usuarios.findOneBy({ id: refresh.usuarioId });
      if (!usuario) {
        await sessoes.delete({ refreshToken: atual });
        await sessoes.delete({ token: atual });
        throw new UnauthorizedException('Sessão inválida ou expirada — faça login');
      }
      // Consumo antes de emitir: se outra requisição já consumiu, affected=0.
      const consumido = await sessoes.delete({ token: atual });
      if ((consumido.affected ?? 0) === 0) {
        throw new UnauthorizedException('Sessão inválida ou expirada — faça login');
      }
      await sessoes.delete({ refreshToken: atual });
      const token = randomBytes(32).toString('hex');
      const novoRefresh = randomBytes(32).toString('hex');
      const expiraEm = new Date(Date.now() + ACCESS_TTL_MS).toISOString();
      const expiraRefresh = new Date(Date.now() + REFRESH_TTL_MS).toISOString();
      await sessoes.save({ token: novoRefresh, usuarioId: usuario.id, expiraEm: expiraRefresh, tipo: 'refresh', refreshToken: null });
      await sessoes.save({ token, usuarioId: usuario.id, expiraEm, tipo: 'access', refreshToken: novoRefresh });
      return { usuario: publico(usuario), token, expiraEm, refreshToken: novoRefresh };
    });
  }

  /** Avatar = dataURL de imagem ou null (remove). */
  async atualizarPerfil(usuarioId: number, body: AtualizarPerfilDto): Promise<{ usuario: UsuarioPublico }> {
    const usuario = await this.usuarios.findOneBy({ id: usuarioId });
    if (!usuario) throw new UnauthorizedException('Sessão inválida ou expirada — faça login');
    if (body.nome !== undefined) {
      usuario.nome = body.nome.trim();
    }
    if (body.email !== undefined) {
      const email = normalizaEmail(body.email);
      const outro = await this.usuarios.findOneBy({ email });
      if (outro && outro.id !== usuarioId) {
        throw new ConflictException('Este e-mail já está em uso por outra conta');
      }
      usuario.email = email;
    }
    if (body.avatar !== undefined) {
      usuario.avatar = body.avatar;
    }
    const salvo = await this.usuarios.save(usuario);
    await this.auditoria.registrar(usuarioId, {
      modulo: 'auth',
      acao: 'atualizar',
      descricao: `Perfil atualizado · ${salvo.email}`,
    });
    return { usuario: publico(salvo) };
  }

  async trocarSenha(
    usuarioId: number,
    body: TrocarSenhaDto,
    tokenAtual?: string,
  ): Promise<{ usuario: UsuarioPublico }> {
    const usuario = await this.usuarios.findOneBy({ id: usuarioId });
    if (!usuario) throw new UnauthorizedException('Sessão inválida ou expirada — faça login');
    const atual = body.senhaAtual;
    const nova = body.novaSenha;
    if (typeof atual !== 'string' || !(await confereSenha(atual, usuario.senhaHash))) {
      throw new UnauthorizedException('Senha atual incorreta');
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
    await this.auditoria.registrar(usuarioId, {
      modulo: 'auth',
      acao: 'atualizar',
      descricao: 'Senha trocada',
    });
    return { usuario: publico(salvo) };
  }

  /**
   * Estado das integrações do dono. A chave do Resend nunca volta inteira:
   * só um mascarado para reconhecer qual está ativa.
   */
  async obterIntegracoes(usuarioId: number): Promise<StatusIntegracoes> {
    const usuario = await this.usuarios.findOneBy({ id: usuarioId });
    if (!usuario) throw new UnauthorizedException('Sessão inválida ou expirada — faça login');
    const daConta = usuario.resendApiKey?.trim() || null;
    const doAmbiente = process.env.RESEND_API_KEY?.trim() || null;
    const efetiva = daConta ?? doAmbiente;
    return {
      email: {
        configurado: !!efetiva,
        origem: daConta ? 'conta' : doAmbiente ? 'ambiente' : null,
        mascarada: efetiva ? mascararChave(efetiva) : null,
      },
    };
  }

  /**
   * Salva (ou limpa, com string vazia/null) a chave do Resend da conta.
   * Vale só para o dono; sem chave na conta, vale a do servidor (RESEND_API_KEY).
   */
  async salvarIntegracoes(usuarioId: number, body: SalvarIntegracoesDto): Promise<StatusIntegracoes> {
    const usuario = await this.usuarios.findOneBy({ id: usuarioId });
    if (!usuario) throw new UnauthorizedException('Sessão inválida ou expirada — faça login');
    if (body.resendApiKey !== undefined) {
      const chave = body.resendApiKey === null ? '' : String(body.resendApiKey).trim();
      usuario.resendApiKey = chave || null;
      await this.usuarios.save(usuario);
    }
    return this.obterIntegracoes(usuarioId);
  }

  /** Chave efetiva para envio (recuperação de senha etc.): conta primeiro, servidor depois. */
  async chaveResendEfetiva(usuarioId: number): Promise<string | null> {
    const usuario = await this.usuarios.findOneBy({ id: usuarioId });
    return usuario?.resendApiKey?.trim() || process.env.RESEND_API_KEY?.trim() || null;
  }

  /**
   * Pede o e-mail de recuperação. Resposta sempre genérica: não revela se o
   * e-mail é cadastrado nem se o envio funcionou (anti-enumeração). O token
   * puro só existe no link — no banco fica só o hash SHA-256.
   */
  async solicitarRecuperacao(body: RecuperarSenhaDto): Promise<{ ok: true }> {
    await this.recuperacoes.delete({ expiraEm: LessThan(new Date().toISOString()) });
    const email = normalizaEmail(body.email);
    const usuario = email ? await this.usuarios.findOneBy({ email }) : null;
    if (!usuario) return { ok: true };
    const chave = await this.chaveResendEfetiva(usuario.id);
    if (!chave) {
      console.warn(`[recuperacao] sem chave do Resend (usuário ${usuario.id}) — e-mail não enviado`);
      return { ok: true };
    }
    // Pedido novo invalida os anteriores ainda pendentes: só o último link vale.
    await this.recuperacoes.delete({ usuarioId: usuario.id, usadoEm: IsNull() });
    const token = randomBytes(32).toString('hex');
    await this.recuperacoes.save({
      usuarioId: usuario.id,
      tokenHash: createHash('sha256').update(token).digest('hex'),
      expiraEm: new Date(Date.now() + RECUPERACAO_TTL_MS).toISOString(),
      usadoEm: null,
    });
    const link = `${urlFrontend()}/#/redefinir-senha?token=${token}`;
    try {
      await this.enviarEmailRecuperacao(chave, usuario.email, usuario.nome, link);
    } catch (e) {
      console.error(
        `[recuperacao] falha no envio (usuário ${usuario.id}):`,
        e instanceof Error ? e.message : e,
      );
    }
    return { ok: true };
  }

  /** Troca a senha via token do e-mail; uso único, derruba todas as sessões. */
  async redefinirSenha(body: RedefinirSenhaDto): Promise<{ ok: true }> {
    const token = body.token.trim();
    const nova = body.novaSenha;
    if (!token) throw new BadRequestException('Token inválido ou expirado');
    const pedido = await this.recuperacoes.findOneBy({
      tokenHash: createHash('sha256').update(token).digest('hex'),
    });
    if (!pedido || pedido.usadoEm || new Date(pedido.expiraEm).getTime() < Date.now()) {
      throw new BadRequestException('Token inválido ou expirado');
    }
    const usuario = await this.usuarios.findOneBy({ id: pedido.usuarioId });
    if (!usuario) throw new BadRequestException('Token inválido ou expirado');
    usuario.senhaHash = await hashSenha(nova);
    await this.usuarios.save(usuario);
    pedido.usadoEm = new Date().toISOString();
    await this.recuperacoes.save(pedido);
    // Reset prova acesso ao e-mail, não à senha antiga: derruba tudo, sem exceção.
    await this.sessoes.delete({ usuarioId: usuario.id });
    return { ok: true };
  }

  /**
   * Resolve o dono a partir do access Bearer; null quando ausente/inválido/expirado.
   * Refresh nunca autentica rota — só o POST /auth/refresh o aceita, via cookie.
   * Sessões legadas (tipo NULL, era do localStorage) valem como access até expirarem.
   */
  async donoDoToken(cabecalho: string | undefined): Promise<Usuario | null> {
    const token = (cabecalho ?? '').replace(/^Bearer\s+/i, '').trim();
    if (!token) return null;
    const sessao = await this.sessoes.findOneBy({ token });
    if (!sessao) return null;
    if ((sessao as Sessao).tipo === 'refresh') return null;
    if (!sessao || new Date(sessao.expiraEm).getTime() < Date.now()) {
      if (sessao) await this.sessoes.delete({ token });
      return null;
    }
    return this.usuarios.findOneBy({ id: sessao.usuarioId });
  }

  private async enviarEmailRecuperacao(
    chave: string,
    para: string,
    nome: string,
    link: string,
  ): Promise<void> {
    // Sem domínio próprio verificado, o Resend só entrega para o e-mail da
    // conta Resend — defina EMAIL_REMETENTE com domínio verificado em produção.
    const remetente = process.env.EMAIL_REMETENTE?.trim() || 'FinFin <onboarding@resend.dev>';
    const resend = new Resend(chave);
    const { error } = await resend.emails.send({
      from: remetente,
      to: para,
      subject: 'Recupere sua senha do FinFin',
      text:
        `Olá, ${nome}!\n\n` +
        `Pediu para redefinir sua senha do FinFin? Abra o link (vale por 1 hora, uso único):\n\n${link}\n\n` +
        `Se não foi você, ignore — sua senha continua a mesma.`,
      html:
        `<p>Olá, ${escapeHtml(nome)}!</p>` +
        `<p>Pediu para redefinir sua senha do FinFin? ` +
        `<a href="${link}">Clique aqui para criar uma nova senha</a> ` +
        `(vale por 1 hora, uso único).</p>` +
        `<p>Se não foi você, ignore — sua senha continua a mesma.</p>`,
    });
    if (error) throw new Error(error.message);
  }

  private async abrirSessao(usuario: Usuario): Promise<SessaoCriada> {
    const token = randomBytes(32).toString('hex');
    const refreshToken = randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + ACCESS_TTL_MS).toISOString();
    const expiraRefresh = new Date(Date.now() + REFRESH_TTL_MS).toISOString();
    await this.sessoes.save({ token: refreshToken, usuarioId: usuario.id, expiraEm: expiraRefresh, tipo: 'refresh', refreshToken: null });
    await this.sessoes.save({ token, usuarioId: usuario.id, expiraEm, tipo: 'access', refreshToken });
    return { usuario: publico(usuario), token, expiraEm, refreshToken };
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
      // Garante seed mesmo em base zerada.
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
