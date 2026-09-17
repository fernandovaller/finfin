import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/** Requisições por minuto quando a rota não define teto próprio. */
const LIMITE_PADRAO = 100;
const META_LIMITE = 'finfin_limite';
const MINUTO_MS = 60_000;

/** Teto próprio da rota: `@Limite(10)` = 10 req/min por IP. */
export const Limite = (porMinuto: number) => SetMetadata(META_LIMITE, porMinuto);

interface Registro {
  janela: number;
  contador: number;
}

/**
 * Guard global de taxa: N requisições por minuto, por IP e rota, contadas em
 * memória (instância única).
 */
@Injectable()
export class LimiteGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  private readonly registros = new Map<string, Registro>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const limite =
      this.reflector.getAllAndOverride<number>(META_LIMITE, [
        context.getHandler(),
        context.getClass(),
      ]) ?? LIMITE_PADRAO;
    const agora = Date.now();
    const chave = `${req.ip ?? ''}|${String(req.route?.path ?? req.path)}`;
    const registro = this.registros.get(chave);
    if (!registro || agora - registro.janela >= MINUTO_MS) {
      this.registros.set(chave, { janela: agora, contador: 1 });
    } else if (registro.contador + 1 > limite) {
      throw new HttpException('Muitas requisições — aguarde um momento e tente de novo', 429);
    } else {
      registro.contador++;
    }
    // Freio de memória: descarta registros de janelas expiradas.
    if (this.registros.size > 10_000) {
      for (const [chaveAntiga, r] of this.registros) {
        if (agora - r.janela >= MINUTO_MS) this.registros.delete(chaveAntiga);
      }
    }
    return true;
  }
}