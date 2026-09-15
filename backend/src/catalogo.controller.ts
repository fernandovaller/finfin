import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { CatalogoService } from './catalogo.service';

@Controller()
@UseGuards(AuthGuard)
export class CatalogoController {
  constructor(private readonly catalogo: CatalogoService) {}

  @Get('categorias')
  listCategorias(@Req() req: any, @Query('tipo') tipo?: string) {
    return this.catalogo.listCategorias(req.usuario.id, tipo);
  }

  @Post('categorias')
  createCategoria(@Req() req: any, @Body() body: any) {
    return this.catalogo.createCategoria(req.usuario.id, body);
  }

  @Put('categorias/:id')
  updateCategoria(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.catalogo.updateCategoria(req.usuario.id, id, body);
  }

  @Delete('categorias/:id')
  @HttpCode(204)
  deleteCategoria(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.catalogo.deleteCategoria(req.usuario.id, id);
  }

  @Get('formas-pagamento')
  listFormas(@Req() req: any) {
    return this.catalogo.listFormas(req.usuario.id);
  }

  @Post('formas-pagamento')
  createForma(@Req() req: any, @Body() body: any) {
    return this.catalogo.createForma(req.usuario.id, body);
  }

  @Put('formas-pagamento/:id')
  updateForma(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.catalogo.updateForma(req.usuario.id, id, body);
  }

  @Delete('formas-pagamento/:id')
  @HttpCode(204)
  deleteForma(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.catalogo.deleteForma(req.usuario.id, id);
  }

  @Get('contas')
  listContas(@Req() req: any) {
    return this.catalogo.listContas(req.usuario.id);
  }

  @Post('contas')
  createConta(@Req() req: any, @Body() body: any) {
    return this.catalogo.createConta(req.usuario.id, body);
  }

  @Put('contas/:id')
  updateConta(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.catalogo.updateConta(req.usuario.id, id, body);
  }

  @Delete('contas/:id')
  @HttpCode(204)
  deleteConta(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.catalogo.deleteConta(req.usuario.id, id);
  }

  @Post('restaurar')
  restaurarPadrao(@Req() req: any) {
    return this.catalogo.restaurarPadrao(req.usuario.id);
  }
}
