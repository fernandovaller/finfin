import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './auth.guard';
import {
  CreateDespesaDto,
  CreateReceitaDto,
  ImportarBackupDto,
  ImportarOfxDto,
  UpdateDespesaDto,
  UpdateReceitaDto,
} from './dto/lancamentos.dto';
import {
  ContaQueryDto,
  DeleteDespesaQueryDto,
  ExportarCsvQueryDto,
  ResumoQueryDto,
} from './dto/consulta.dto';

@Controller()
@UseGuards(AuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('receitas')
  createReceita(@Req() req: any, @Body() body: CreateReceitaDto) {
    return this.appService.createReceita(req.usuario.id, body);
  }

  @Get('receitas')
  listReceitas(@Req() req: any, @Query() q: ContaQueryDto) {
    return this.appService.listReceitas(req.usuario.id, q.contaId);
  }

  @Delete('receitas/:id')
  @HttpCode(204)
  deleteReceita(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.appService.deleteReceita(req.usuario.id, id);
  }

  @Put('receitas/:id')
  updateReceita(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateReceitaDto) {
    return this.appService.updateReceita(req.usuario.id, id, body);
  }

  @Post('despesas')
  createDespesa(@Req() req: any, @Body() body: CreateDespesaDto) {
    return this.appService.createDespesa(req.usuario.id, body);
  }

  @Get('despesas')
  listDespesas(@Req() req: any, @Query() q: ContaQueryDto) {
    return this.appService.listDespesas(req.usuario.id, q.contaId);
  }

  @Delete('despesas/:id')
  deleteDespesa(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query() q: DeleteDespesaQueryDto,
  ) {
    return this.appService.deleteDespesa(req.usuario.id, id, q.escopo);
  }

  @Put('despesas/:id')
  updateDespesa(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: UpdateDespesaDto) {
    return this.appService.updateDespesa(req.usuario.id, id, body);
  }

  @Get('resumo')
  resumo(@Req() req: any, @Query() q: ResumoQueryDto) {
    return this.appService.resumo(req.usuario.id, q.mes, q.contaId);
  }

  @Get('contagem')
  contagem(@Req() req: any) {
    return this.appService.contagem(req.usuario.id);
  }

  @Get('exportar')
  exportar(@Req() req: any) {
    return this.appService.exportar(req.usuario.id);
  }

  @Get('exportar/csv')
  exportarCsv(@Req() req: any, @Query() q: ExportarCsvQueryDto) {
    return this.appService.exportarCsv(req.usuario.id, q.tipo);
  }

  @Post('importar')
  importar(@Req() req: any, @Body() body: ImportarBackupDto) {
    return this.appService.importar(req.usuario.id, body);
  }

  @Post('importar/ofx')
  importarOfx(@Req() req: any, @Body() body: ImportarOfxDto) {
    return this.appService.importarOfx(req.usuario.id, body);
  }

  @Delete('dados/lancamentos')
  apagarLancamentos(@Req() req: any) {
    return this.appService.apagarLancamentos(req.usuario.id);
  }

  @Delete('dados/tudo')
  apagarTudo(@Req() req: any) {
    return this.appService.apagarTudo(req.usuario.id);
  }

  @Get('dados/demonstracao')
  statusDemonstracao(@Req() req: any) {
    return this.appService.statusDemonstracao(req.usuario.id);
  }

  @Post('dados/demonstracao')
  gerarDemonstracao(@Req() req: any) {
    return this.appService.gerarDemonstracao(req.usuario.id);
  }

  @Delete('dados/demonstracao')
  removerDemonstracao(@Req() req: any) {
    return this.appService.removerDemonstracao(req.usuario.id);
  }
}
