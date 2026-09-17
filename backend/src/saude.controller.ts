import { Controller, Get } from '@nestjs/common';
import { Limite } from './limite.guard';

/**
 * Saúde pública da API (sem auth): o app Android valida servidor e
 * compatibilidade antes do login. 60/min por IP — folga para healthcheck
 * (30s) + checagens do app, sem virar vetor de DoS.
 */
@Controller('saude')
export class SaudeController {
  @Get()
  @Limite(60)
  verificar(): { ok: true; app: 'finfin'; versao: 1 } {
    return { ok: true, app: 'finfin', versao: 1 };
  }
}
