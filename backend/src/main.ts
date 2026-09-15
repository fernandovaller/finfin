import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { chmodSync, existsSync } from 'node:fs';
import { AppModule } from './app.module';

/** Origens liberadas para chamadas cross-origin (mesma origem não é afetada). */
const ORIGENS_PERMITIDAS = new Set(['http://localhost:3000', 'http://127.0.0.1:3000']);

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
  await app.listen(3001);
}
bootstrap();