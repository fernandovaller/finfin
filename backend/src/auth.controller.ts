import { Body, Controller, Get, Headers, HttpCode, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from './auth.guard';
import { AuthService, UsuarioPublico } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** 10 tentativas por minuto por IP — freia força bruta e DoS de CPU via scrypt. */
  @Post('cadastro')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  cadastro(@Body() body: any) {
    return this.auth.cadastro(body);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() body: any) {
    return this.auth.login(body);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Headers('authorization') autorizacao?: string) {
    const token = (autorizacao ?? '').replace(/^Bearer\s+/i, '').trim();
    return this.auth.logout(token);
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
  perfil(@Req() req: any, @Body() body: any) {
    return this.auth.atualizarPerfil(req.usuario.id, body);
  }

  @Put('senha')
  @UseGuards(AuthGuard)
  senha(@Req() req: any, @Body() body: any) {
    return this.auth.trocarSenha(req.usuario.id, body);
  }
}
