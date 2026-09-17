import { Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaQueryDto, LimparAuditoriaQueryDto } from './dto/consulta.dto';

@Controller('auditoria')
@UseGuards(AuthGuard)
export class AuditoriaController {
  constructor(private readonly auditoria: AuditoriaService) {}

  /** Lista paginada: ?modulo=&acao=&descricao=&dataInicio=YYYY-MM-DD&dataFim=&pagina=&porPagina= */
  @Get()
  listar(@Req() req: any, @Query() q: AuditoriaQueryDto) {
    return this.auditoria.listar(req.usuario.id, q);
  }

  /** Limpeza manual: DELETE /api/auditoria?antesDe=YYYY-MM-DD (sem param = tudo). */
  @Delete()
  limpar(@Req() req: any, @Query() q: LimparAuditoriaQueryDto) {
    return this.auditoria.limpar(req.usuario.id, q.antesDe);
  }

  /** Restaura um registro excluído a partir do snapshot do evento. */
  @Post(':id/restaurar')
  restaurar(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.auditoria.restaurar(req.usuario.id, id);
  }
}
