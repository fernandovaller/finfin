import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';
import { Categoria } from './categoria.entity';
import { Conta } from './conta.entity';
import { Despesa } from './despesa.entity';
import { FormaPagamento } from './forma-pagamento.entity';
import { Receita } from './receita.entity';
import { Sessao } from './sessao.entity';
import { Usuario } from './usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data/finfin.sqlite',
      entities: [Receita, Despesa, Categoria, FormaPagamento, Conta, Usuario, Sessao],
      synchronize: true, // dev: cria/atualiza tabelas automaticamente (trocar por migrations em produção)
    }),
    TypeOrmModule.forFeature([Receita, Despesa, Categoria, FormaPagamento, Conta, Usuario, Sessao]),
  ],
  controllers: [AuthController, AppController, CatalogoController],
  providers: [AuthService, AuthGuard, AppService, CatalogoService],
})
export class AppModule {}
