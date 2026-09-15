import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
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
  await app.listen(3001);
}
bootstrap();