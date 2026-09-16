import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';
import { LimiteGuard } from './limite.guard';
import { Categoria } from './categoria.entity';
import { Conta } from './conta.entity';
import { Despesa } from './despesa.entity';
import { FormaPagamento } from './forma-pagamento.entity';
import { Receita } from './receita.entity';
import { Sessao } from './sessao.entity';
import { Usuario } from './usuario.entity';
import { CriacaoInicial1789505184849 } from './migrations/1789505184849-criacao-inicial';
import { ResendApiKey1789558563730 } from './migrations/1789558563730-resend-api-key';
import { RecuperacaoSenha1789559058157 } from './migrations/1789559058157-recuperacao-senha';
import { RecuperacaoSenha } from './recuperacao-senha.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data/finfin.sqlite',
      entities: [Receita, Despesa, Categoria, FormaPagamento, Conta, Usuario, Sessao, RecuperacaoSenha],
      // As migrations são o único dono do schema — nunca reativar `synchronize`.
      migrations: [CriacaoInicial1789505184849, ResendApiKey1789558563730, RecuperacaoSenha1789559058157],
      migrationsRun: true, // aplica migrations pendentes no boot (banco novo ou existente)
    }),
    TypeOrmModule.forFeature([Receita, Despesa, Categoria, FormaPagamento, Conta, Usuario, Sessao, RecuperacaoSenha]),
  ],
  controllers: [AuthController, AppController, CatalogoController],
  providers: [
    AuthService,
    AuthGuard,
    AppService,
    CatalogoService,
    // Global (roda antes do AuthGuard): protege também as rotas públicas de auth.
    { provide: APP_GUARD, useClass: LimiteGuard },
  ],
})
export class AppModule {}
