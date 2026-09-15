import { ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

/**
 * Guard global de taxa de requisições (usado como APP_GUARD no AppModule).
 * Sobrescreve a exceção padrão da lib para responder em pt-BR.
 */
@Injectable()
export class ThrottleGuard extends ThrottlerGuard {
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    throw new HttpException('Muitas requisições — aguarde um momento e tente de novo', 429);
  }
}