import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuditLogService } from '../services/audit-log.service';
import { RequiredPermissions } from 'src/permission/decorators/permission.decorator';
import { ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from 'src/permission/guards/permission.guard';

@ApiTags('审计日志管理')
@Controller('audit-logs')
@UseGuards(PermissionGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequiredPermissions('audit:view')
  async findAll() {
    return this.auditLogService.findAll();
  }
}
