import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { AuditLogService } from 'src/audit-log/services/audit-log.service';
import { OauthClient } from 'src/client/entities/oauth-client.entity';
import { ClientService } from 'src/client/services/client.service';
import { RedisService } from 'src/shared/redis.service';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/services/user.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly clientService: ClientService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly auditLogService: AuditLogService,
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
  ) {}

  /**
   * 验证用户凭据
   * @param username 用户名
   * @param password 密码
   * @param ip IP地址
   */
  async validateUser(username: string, password: string, ip: string) {
    try {
      const user = await this.userService.findOneByUsername(username);
      if (!user) {
        await this.auditLogService.create({
          type: 'login',
          userId: 0,
          clientId: '',
          ip,
          result: 'fail',
          errorMsg: '用户不存在',
        });
        throw new UnauthorizedException('用户不存在');
      }

      if (!this.userService.verifyPassword(password, user.password)) {
        await this.auditLogService.create({
          type: 'login',
          userId: user.id,
          clientId: '',
          ip,
          result: 'fail',
          errorMsg: '密码错误',
        });
        throw new UnauthorizedException('密码错误');
      }
      await this.auditLogService.create({
        type: 'login',
        userId: user.id,
        clientId: '',
        ip,
        result: 'success',
      });

      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 生成授权码 (Authorization Code)
   * @param user 用户信息
   * @param clientId 客户端ID
   * @param ip IP地址
   */
  async generateAuthCode(
    user: User,
    clientId: string,
    ip: string,
  ): Promise<string> {
    try {
      const authCode = uuidv4();
      const codePayload = { userId: user.id, clientId, code: authCode };

      await this.redisClient.set(
        `auth_code:${authCode}`,
        JSON.stringify(codePayload),
        'EX',
        60 * 5, // 5分钟有效期
      );
      await this.auditLogService.create({
        type: 'authorize',
        userId: user.id,
        clientId,
        ip,
        result: 'success',
      });

      return authCode;
    } catch (error) {
      await this.auditLogService.create({
        type: 'authorize',
        userId: user.id,
        clientId,
        ip,
        result: 'fail',
        errorMsg: error.message,
      });
      throw error;
    }
  }

  /**
   * 使用授权码或刷新令牌生成OIDC令牌
   * @param user 用户信息
   * @param client 客户端信息
   * @param ip IP地址
   */
  async generateOidcTokens(user: User, client: OauthClient, ip: string) {
    try {
      const payload = {
        sub: user.id,
        username: user.username,
        roles: user.roles,
        clientId: client.clientId,
      };

      const accessTokenExpiresIn = this.configService.get(
        'jwt.accessTokenExpiresIn',
      );
      const refreshTokenExpiresIn = this.configService.get(
        'jwt.refreshTokenExpiresIn',
      );

      // 1、生成 Access Token
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: accessTokenExpiresIn,
      });

      // 2、生成 ID Token OIDC
      const idToken = this.jwtService.sign({
        ...payload,
        iss: this.configService.get('IDP_DOMAIN'),
        aud: client.clientId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1小时
      });
    } catch (error) {}
  }

  async verifyAuthCode(code: string, ip: string) {}

  async refreshToken(refreshToken: string, ip: string) {
    try {
      const userId = await this.redisClient.get(
        `refresh_token:${refreshToken}`,
      );
      if (!userId) {
        await this.auditLogService.create({
          type: 'token',
          userId: 0,
          clientId: '',
          ip,
          result: 'fail',
          errorMsg: '刷新令牌无效',
        });
        throw new UnauthorizedException('刷新令牌无效');
      }

      await this.redisClient.del(`refresh_token:${refreshToken}`);

      const user = await this.userService.findOneById(+userId);

      const client = await this.clientService.findOneByClientId('');
    } catch (error) {
      throw error;
    }
  }
}
