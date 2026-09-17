import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { chmodSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';

// Carrega .env do backend e da raiz do projeto (raiz tem prioridade menor;
// variável já exportada no ambiente nunca é sobrescrita).
dotenv.config({ quiet: true });
dotenv.config({ path: resolve(__dirname, '..', '..', '.env'), quiet: true });

/** Porta do backend: BACKEND_PORT (ou PORT, padrão do Docker/PaaS) — padrão 3001. */
const PORTA_BACKEND = Number(process.env.BACKEND_PORT ?? process.env.PORT ?? 3001) || 3001;
/** Porta do frontend em dev — usada para liberar o CORS. Padrão 3000. */
const PORTA_FRONTEND = Number(process.env.FRONTEND_PORT ?? 3000) || 3000;

/** Origens liberadas para chamadas cross-origin (mesma origem não é afetada). */
const ORIGENS_PERMITIDAS = new Set([
  `http://localhost:${PORTA_FRONTEND}`,
  `http://127.0.0.1:${PORTA_FRONTEND}`,
]);

// Origens extras via env (app externo, celular na LAN, etc.):
// CORS_ORIGINS=http://192.168.0.10:3000,http://localhost:8081
for (const origem of (process.env.CORS_ORIGINS ?? '').split(',')) {
  const limpa = origem.trim();
  if (limpa) ORIGENS_PERMITIDAS.add(limpa);
}

/** Erro 500 genérico: nunca vaza stack, SQL ou caminho interno em produção. */
@Catch()
class FiltroErros implements ExceptionFilter {
  catch(excecao: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const req = host.switchToHttp().getRequest();
    if (excecao instanceof HttpException) {
      const corpo = excecao.getResponse();
      const status = excecao.getStatus();
      // HttpException já é mensagem curada — repassa sem stack.
      res.status(status).json(
        typeof corpo === 'object' && corpo !== null
          ? { ...corpo, path: undefined }
          : { statusCode: status, message: corpo },
      );
      return;
    }
    // body-parser (limite 1mb): vira 413, não 500.
    const codigo = (excecao as any)?.type ?? (excecao as any)?.code;
    const statusEmbutido = (excecao as any)?.status;
    if (codigo === 'entity.too.large' || statusEmbutido === 413) {
      res.status(413).json({ statusCode: 413, message: 'Corpo grande demais (máximo 1 MB)' });
      return;
    }
    console.error(`[erro] ${req?.method} ${req?.url}:`, excecao instanceof Error ? excecao.message : excecao);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      message: 'Erro interno — tente de novo',
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.use(helmet());
  // Teto do corpo: avatar (500 KB) + lote OFX (2000 itens) cabem; gigante não.
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  // Item 1 do SECURITY.md: valida DTOs, remove campo extra e converte tipos.
  // Só atua onde o controller declara DTO — rotas ainda em `body: any`
  // passam ilesas até serem migradas (ver src/dto/auth.dto.ts).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new FiltroErros());
  app.use(cookieParser());
  // Atrás do nginx o IP real vem via X-Forwarded-For — sem isso o rate limit
  // enxerga todo mundo como o IP do proxy (teto compartilhado). Ligado via
  // CONFIAR_PROXY=true (o compose já liga); fora de proxy, manter desligado
  // para ninguém forjar IP via header.
  if (process.env.CONFIAR_PROXY === 'true') app.set('trust proxy', 1);
  app.enableCors({
    origin: (origem, callback) => callback(null, !origem || ORIGENS_PERMITIDAS.has(origem)),
    // O refresh viaja em cookie HttpOnly — o navegador só o envia com credentials.
    credentials: true,
  });
  // Dados financeiros em arquivo local: sem leitura por outros usuários do host.
  // (caminho relativo ao cwd do backend, igual ao TypeORM)
  try {
    if (existsSync('data/finfin.sqlite')) chmodSync('data/finfin.sqlite', 0o600);
  } catch {
    // FS sem chmod (ex.: Windows): ignora.
  }
  await app.listen(PORTA_BACKEND, '0.0.0.0');
}
bootstrap();