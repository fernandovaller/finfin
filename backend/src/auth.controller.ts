import { Body, Controller, Get, Headers, HttpCode, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { AuthGuard } from './auth.guard';
import { AuthService, UsuarioPublico } from './auth.service';
import {
  AtualizarPerfilDto,
  CadastroDto,
  LoginDto,
  RecuperarSenhaDto,
  RedefinirSenhaDto,
  SalvarIntegracoesDto,
  TrocarSenhaDto,
} from './dto/auth.dto';
import { Limite } from './limite.guard';

/** Nome do cookie do refresh (nunca lido pelo JS: HttpOnly). */
export const COOKIE_REFRESH = 'finfin_refresh';
/** Refresh dura 7 dias — igual ao REFRESH_TTL_MS do service. */
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function opcoesCookieRefresh(): CookieOptions {
  return {
    httpOnly: true,
    // O refresh só circula entre o navegador e /api/auth (login/refresh/logout).
    // Não é enviado às rotas de dados — superfície de CSRF mínima.
    path: '/api/auth',
    sameSite: 'strict',
    secure: cookieSeguroAtivo(),
  };
}

/** Produção exige https: Secure=true sempre; dev segue COOKIE_SECURE. */
function cookieSeguroAtivo(): boolean {
  if (process.env.NODE_ENV === 'production') return true;
  return process.env.COOKIE_SECURE === 'true';
}

/** Fail-fast no boot: produção sem COOKIE_SECURE=true é erro de deploy. */
export function assertConfigCookies(): void {
  if (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'true') {
    throw new Error('COOKIE_SECURE=true obrigatório em produção (cookie do refresh exige https)');
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** 10 tentativas por minuto por IP — freia força bruta e DoS de CPU via scrypt. */
  @Post('cadastro')
  @Limite(10)
  async cadastro(@Body() body: CadastroDto, @Res({ passthrough: true }) res: Response) {
    const sessao = await this.auth.cadastro(body);
    res.cookie(COOKIE_REFRESH, sessao.refreshToken, { ...opcoesCookieRefresh(), maxAge: COOKIE_MAX_AGE_MS });
    return { usuario: sessao.usuario, token: sessao.token, expiraEm: sessao.expiraEm };
  }

  @Post('login')
  @Limite(10)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const sessao = await this.auth.login(body);
    res.cookie(COOKIE_REFRESH, sessao.refreshToken, { ...opcoesCookieRefresh(), maxAge: COOKIE_MAX_AGE_MS });
    return { usuario: sessao.usuario, token: sessao.token, expiraEm: sessao.expiraEm };
  }

  /**
   * Renova o access (15 min) usando o refresh do cookie HttpOnly.
   * Rotação: cada chamada invalida o refresh anterior e emite par novo.
   */
  @Post('refresh')
  @Limite(30)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const sessao = await this.auth.refreshSessao(req.cookies?.[COOKIE_REFRESH] ?? '');
    res.cookie(COOKIE_REFRESH, sessao.refreshToken, { ...opcoesCookieRefresh(), maxAge: COOKIE_MAX_AGE_MS });
    return { usuario: sessao.usuario, token: sessao.token, expiraEm: sessao.expiraEm };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Headers('authorization') autorizacao: string | undefined,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (autorizacao ?? '').replace(/^Bearer\s+/i, '').trim();
    await this.auth.logout(token, req.cookies?.[COOKIE_REFRESH]);
    res.clearCookie(COOKIE_REFRESH, opcoesCookieRefresh());
    return;
  }

  @Get('eu')
  async eu(@Req() req: any): Promise<{ usuario: UsuarioPublico | null }> {
    const usuario = await this.auth.donoDoToken(req.headers?.authorization);
    if (!usuario) return { usuario: null };
    return {
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, avatar: usuario.avatar ?? null },
    };
  }

  @Put('perfil')
  @UseGuards(AuthGuard)
  perfil(@Req() req: any, @Body() body: AtualizarPerfilDto) {
    return this.auth.atualizarPerfil(req.usuario.id, body);
  }

  @Put('senha')
  @UseGuards(AuthGuard)
  senha(@Req() req: any, @Body() body: TrocarSenhaDto) {
    const token = (req.headers?.authorization ?? '').replace(/^Bearer\s+/i, '').trim();
    return this.auth.trocarSenha(req.usuario.id, body, token);
  }

  @Get('integracoes')
  @UseGuards(AuthGuard)
  integracoes(@Req() req: any) {
    return this.auth.obterIntegracoes(req.usuario.id);
  }

  @Put('integracoes')
  @UseGuards(AuthGuard)
  salvarIntegracoes(@Req() req: any, @Body() body: SalvarIntegracoesDto) {
    return this.auth.salvarIntegracoes(req.usuario.id, body);
  }

  @Post('recuperar-senha')
  @Limite(5)
  recuperarSenha(@Body() body: RecuperarSenhaDto) {
    return this.auth.solicitarRecuperacao(body);
  }

  @Post('redefinir-senha')
  @Limite(5)
  redefinirSenha(@Body() body: RedefinirSenhaDto) {
    return this.auth.redefinirSenha(body);
  }
}
