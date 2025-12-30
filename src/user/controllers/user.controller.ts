import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserService } from '../services/user.service';
import { ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../../permission/guards/permission.guard';
import { RequiredPermissions } from 'src/permission/decorators/permission.decorator';
import { CreateUserDto } from '../dto/create-user.dto';

@ApiTags('用户管理')
@Controller('users')
@UseGuards(PermissionGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @RequiredPermissions('user:manage')
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }
}
