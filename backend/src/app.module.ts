import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaService } from './auditoria.service';
import { Auditoria } from './auditoria.entity';
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
import { Auditoria1789561000000 } from './migrations/1789561000000-auditoria';
import { RecuperacaoSenha } from './recuperacao-senha.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data/finfin.sqlite',
      entities: [Receita, Despesa, Categoria, FormaPagamento, Conta, Usuario, Sessao, RecuperacaoSenha, Auditoria],
      // As migrations são o único dono do schema — nunca reativar `synchronize`.
      migrations: [CriacaoInicial1789505184849, ResendApiKey1789558563730, RecuperacaoSenha1789559058157, Auditoria1789561000000],
      migrationsRun: true, // aplica migrations pendentes no boot (banco novo ou existente)
    }),
    TypeOrmModule.forFeature([Receita, Despesa, Categoria, FormaPagamento, Conta, Usuario, Sessao, RecuperacaoSenha, Auditoria]),
  ],
  controllers: [AuthController, AppController, CatalogoController, AuditoriaController],
  providers: [
    AuthService,
    AuthGuard,
    AppService,
    CatalogoService,
    AuditoriaService,
    // Global (roda antes do AuthGuard): protege também as rotas públicas de auth.
    { provide: APP_GUARD, useClass: LimiteGuard },
  ],
})
export class AppModule {}
