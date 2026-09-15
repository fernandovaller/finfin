import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';
import { ThrottleGuard } from './throttle.guard';
import { Categoria } from './categoria.entity';
import { Conta } from './conta.entity';
import { Despesa } from './despesa.entity';
import { FormaPagamento } from './forma-pagamento.entity';
import { Receita } from './receita.entity';
import { Sessao } from './sessao.entity';
import { Usuario } from './usuario.entity';

@Module({
  imports: [
    // Freio genérico: 100 req/min por IP e rota. Login/cadastro têm teto próprio.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data/finfin.sqlite',
      entities: [Receita, Despesa, Categoria, FormaPagamento, Conta, Usuario, Sessao],
      synchronize: true, // dev: cria/atualiza tabelas automaticamente (trocar por migrations em produção)
    }),
    TypeOrmModule.forFeature([Receita, Despesa, Categoria, FormaPagamento, Conta, Usuario, Sessao]),
  ],
  controllers: [AuthController, AppController, CatalogoController],
  providers: [
    AuthService,
    AuthGuard,
    AppService,
    CatalogoService,
    // Global (roda antes do AuthGuard): protege também as rotas públicas de auth.
    { provide: APP_GUARD, useClass: ThrottleGuard },
  ],
})
export class AppModule {}
