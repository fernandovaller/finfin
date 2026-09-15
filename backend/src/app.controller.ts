import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './auth.guard';

@Controller()
@UseGuards(AuthGuard)
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('receitas')
  createReceita(@Req() req: any, @Body() body: any) {
    return this.appService.createReceita(req.usuario.id, body);
  }

  @Get('receitas')
  listReceitas(@Req() req: any, @Query('contaId') contaId?: string) {
    const cid = contaId !== undefined && contaId !== '' ? Number(contaId) : undefined;
    return this.appService.listReceitas(req.usuario.id, cid);
  }

  @Delete('receitas/:id')
  @HttpCode(204)
  deleteReceita(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.appService.deleteReceita(req.usuario.id, id);
  }

  @Put('receitas/:id')
  updateReceita(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.appService.updateReceita(req.usuario.id, id, body);
  }

  @Post('despesas')
  createDespesa(@Req() req: any, @Body() body: any) {
    return this.appService.createDespesa(req.usuario.id, body);
  }

  @Get('despesas')
  listDespesas(@Req() req: any, @Query('contaId') contaId?: string) {
    const cid = contaId !== undefined && contaId !== '' ? Number(contaId) : undefined;
    return this.appService.listDespesas(req.usuario.id, cid);
  }

  @Delete('despesas/:id')
  deleteDespesa(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Query('escopo') escopo?: string,
  ) {
    return this.appService.deleteDespesa(req.usuario.id, id, escopo);
  }

  @Put('despesas/:id')
  updateDespesa(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.appService.updateDespesa(req.usuario.id, id, body);
  }

  @Get('resumo')
  resumo(@Req() req: any, @Query('mes') mes?: string, @Query('contaId') contaId?: string) {
    const cid = contaId !== undefined && contaId !== '' ? Number(contaId) : undefined;
    return this.appService.resumo(req.usuario.id, mes, cid);
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
  exportarCsv(@Req() req: any, @Query('tipo') tipo?: string) {
    return this.appService.exportarCsv(req.usuario.id, tipo ?? '');
  }

  @Post('importar')
  importar(@Req() req: any, @Body() body: any) {
    return this.appService.importar(req.usuario.id, body);
  }

  @Delete('dados/lancamentos')
  apagarLancamentos(@Req() req: any) {
    return this.appService.apagarLancamentos(req.usuario.id);
  }

  @Delete('dados/tudo')
  apagarTudo(@Req() req: any) {
    return this.appService.apagarTudo(req.usuario.id);
  }
}
