import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(helmet());
  // Em produção atrás de um proxy (nginx): descomente para o throttler enxergar
  // o IP real via X-Forwarded-For — senão todo cliente aparece como o IP do proxy.
  // app.set('trust proxy', 1);
  app.enableCors({
    origin: (origem, callback) => callback(null, !origem || ORIGENS_PERMITIDAS.has(origem)),
  });
  // Dados financeiros em arquivo local: sem leitura por outros usuários do host.
  // (caminho relativo ao cwd do backend, igual ao TypeORM)
  try {
    if (existsSync('data/finfin.sqlite')) chmodSync('data/finfin.sqlite', 0o600);
  } catch {
    // FS sem chmod (ex.: Windows): ignora.
  }
  await app.listen(PORTA_BACKEND);
}
bootstrap();