import { ApiTags } from '@nestjs/swagger';
import { ClientService } from '../services/client.service';
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PermissionGuard } from 'src/permission/guards/permission.guard';
import { RequiredPermissions } from 'src/permission/decorators/permission.decorator';
import { CreateClientDto } from '../dto/create-client.dto';

@ApiTags('客户端管理')
@Controller('clients')
// @UseGuards(PermissionGuard)
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @RequiredPermissions('client:manage')
  create(@Body() dto: CreateClientDto) {
    return this.clientService.create(dto);
  }
}
