import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';
import { Categoria } from './categoria.entity';
import { Despesa } from './despesa.entity';
import { FormaPagamento } from './forma-pagamento.entity';
import { Receita } from './receita.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data/finfin.sqlite',
      entities: [Receita, Despesa, Categoria, FormaPagamento],
      synchronize: true, // dev: cria/atualiza tabelas automaticamente (trocar por migrations em produção)
    }),
    TypeOrmModule.forFeature([Receita, Despesa, Categoria, FormaPagamento]),
  ],
  controllers: [AppController, CatalogoController],
  providers: [AppService, CatalogoService],
})
export class AppModule {}
