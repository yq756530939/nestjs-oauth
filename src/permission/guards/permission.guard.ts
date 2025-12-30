import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.roles) return false;

    // 角色-权限映射（企业场景建议从数据库读取）
    const rolePermissions = {
      admin: [
        'user:manage',
        'client:manage',
        'permission:manage',
        'audit:view',
      ],
      finance: ['finance:view', 'finance:export'],
      employee: ['oa:view', 'crm:view'],
    };

    const userPermissions = user.roles.flatMap(
      (role: string) => rolePermissions[role] || [],
    );
    return requiredPermissions.every((perm) => userPermissions.includes(perm));
  }
}
