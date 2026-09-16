import { Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuditoriaService } from './auditoria.service';

@Controller('auditoria')
@UseGuards(AuthGuard)
export class AuditoriaController {
  constructor(private readonly auditoria: AuditoriaService) {}

  /** Lista paginada: ?modulo=&acao=&descricao=&dataInicio=YYYY-MM-DD&dataFim=&pagina=&porPagina= */
  @Get()
  listar(
    @Req() req: any,
    @Query('modulo') modulo?: string,
    @Query('acao') acao?: string,
    @Query('descricao') descricao?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('pagina') pagina?: string,
    @Query('porPagina') porPagina?: string,
  ) {
    return this.auditoria.listar(req.usuario.id, {
      modulo: modulo?.trim() || undefined,
      acao: acao?.trim() || undefined,
      descricao: descricao?.trim() || undefined,
      dataInicio: dataInicio?.trim() || undefined,
      dataFim: dataFim?.trim() || undefined,
      pagina: pagina ? Number(pagina) : undefined,
      porPagina: porPagina ? Number(porPagina) : undefined,
    });
  }

  /** Limpeza manual: DELETE /api/auditoria?antesDe=YYYY-MM-DD (sem param = tudo). */
  @Delete()
  limpar(@Req() req: any, @Query('antesDe') antesDe?: string) {
    return this.auditoria.limpar(req.usuario.id, antesDe?.trim() || undefined);
  }

  /** Restaura um registro excluído a partir do snapshot do evento. */
  @Post(':id/restaurar')
  restaurar(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.auditoria.restaurar(req.usuario.id, id);
  }
}
