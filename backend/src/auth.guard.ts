import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const usuario = await this.auth.donoDoToken(req.headers?.authorization);
    if (!usuario) throw new UnauthorizedException('Sessão inválida ou expirada — faça login');
    req.usuario = usuario;
    return true;
  }
}
