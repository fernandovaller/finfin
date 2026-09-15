import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { CatalogoService } from './catalogo.service';

@Controller()
export class CatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  @Get('categorias')
  listCategorias(@Query('tipo') tipo?: string) {
    return this.catalogo.listCategorias(tipo);
  }

  @Post('categorias')
  createCategoria(@Body() body: any) {
    return this.catalogo.createCategoria(body);
  }

  @Put('categorias/:id')
  updateCategoria(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.catalogo.updateCategoria(id, body);
  }

  @Delete('categorias/:id')
  @HttpCode(204)
  deleteCategoria(@Param('id', ParseIntPipe) id: number) {
    return this.catalogo.deleteCategoria(id);
  }

  @Get('formas-pagamento')
  listFormas() {
    return this.catalogo.listFormas();
  }

  @Post('formas-pagamento')
  createForma(@Body() body: any) {
    return this.catalogo.createForma(body);
  }

  @Put('formas-pagamento/:id')
  updateForma(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.catalogo.updateForma(id, body);
  }

  @Delete('formas-pagamento/:id')
  @HttpCode(204)
  deleteForma(@Param('id', ParseIntPipe) id: number) {
    return this.catalogo.deleteForma(id);
  }
}
