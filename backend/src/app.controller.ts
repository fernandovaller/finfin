import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('receitas')
  createReceita(@Body() body: any) {
    return this.appService.createReceita(body);
  }

  @Get('receitas')
  listReceitas() {
    return this.appService.listReceitas();
  }

  @Delete('receitas/:id')
  @HttpCode(204)
  deleteReceita(@Param('id', ParseIntPipe) id: number) {
    return this.appService.deleteReceita(id);
  }

  @Put('receitas/:id')
  updateReceita(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.appService.updateReceita(id, body);
  }

  @Post('despesas')
  createDespesa(@Body() body: any) {
    return this.appService.createDespesa(body);
  }

  @Get('despesas')
  listDespesas() {
    return this.appService.listDespesas();
  }

  @Delete('despesas/:id')
  @HttpCode(204)
  deleteDespesa(@Param('id', ParseIntPipe) id: number) {
    return this.appService.deleteDespesa(id);
  }

  @Put('despesas/:id')
  updateDespesa(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.appService.updateDespesa(id, body);
  }

  @Get('resumo')
  resumo(@Query('mes') mes?: string) {
    return this.appService.resumo(mes);
  }
}
