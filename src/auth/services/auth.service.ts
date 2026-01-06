import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
    readonly userService: UserService,
    private readonly clientService: ClientService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
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
  async validateUser(
    username: string,
    password: string,
    ip: string,
  ): Promise<User> {
    try {
      const user = await this.userService.findOneByUsername(username);
      if (!user || !this.userService.verifyPassword(password, user.password)) {
        await this.auditLogService.create({
          type: 'login',
          userId: user?.id || 0,
          clientId: '',
          ip,
          result: 'fail',
          errorMsg: '用户不存在或密码错误',
        });
        throw new UnauthorizedException('用户不存在或密码错误');
      }
      await this.auditLogService.create({
        type: 'login',
        userId: user.id,
        clientId: '',
        ip,
        result: 'success',
      });

      return user;
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

      await this.redisClient.set(
        `auth_code:${authCode}`,
        JSON.stringify({ userId: user.id, clientId }),
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
        iss: this.configService.get('IDP_DOMAIN'), // 签发者
        aud: client.clientId, // 受众
        iat: Math.floor(Date.now() / 1000), // 签发时间
        exp: Math.floor(Date.now() / 1000) + 3600, // 过期时间
      });

      // 3、生成 Refresh Token
      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: refreshTokenExpiresIn,
      });
      const refreshTokenExpirySeconds = 7 * 24 * 3600; // 7天
      await this.redisClient.set(
        `refresh_token:${refreshToken}`,
        user.id,
        'EX',
        refreshTokenExpirySeconds,
      );
      // 记录用户的有效刷新令牌，用于全局登出
      await this.redisClient.sadd(
        `user_refresh_tokens:${user.id}`,
        refreshToken,
      );

      await this.auditLogService.create({
        type: 'token',
        userId: user.id,
        clientId: client.clientId,
        ip,
        result: 'success',
      });

      return {
        access_token: accessToken,
        id_token: idToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: this.parseExpiryToSeconds(accessTokenExpiresIn),
      };
    } catch (error) {
      await this.auditLogService.create({
        type: 'token',
        userId: user.id,
        clientId: client.clientId,
        ip,
        result: 'fail',
        errorMsg: error.message,
      });
      throw error;
    }
  }

  /**
   * 验证授权码并换取令牌
   * @param code 授权码
   * @param clientId 客户端ID
   * @param clientSecret 客户端密钥
   * @param ip IP地址
   */
  async verifyAuthCode(
    code: string,
    clientId: string,
    clientSecret: string,
    ip: string,
  ): Promise<{ user: User; client: OauthClient }> {
    try {
      const codeDataStr = await this.redisClient.get(`auth_code:${code}`);
      if (!codeDataStr) {
        throw new UnauthorizedException('无效的授权码');
      }
      const { userId, clientId: codeClientId } = JSON.parse(codeDataStr);

      const multi = this.redisClient.multi();
      multi.get(`auth_code:${code}`);
      multi.del(`auth_code:${code}`);
      const multiResult = await multi.exec();

      if (!multiResult) {
        throw new UnauthorizedException('Redis事务执行失败');
      }

      if (!multiResult[0][1]) {
        throw new UnauthorizedException('授权码已失效或被重复使用');
      }

      if (codeClientId !== clientId) {
        throw new UnauthorizedException('授权码与客户端不匹配');
      }

      const client = await this.clientService.findOneByClientId(clientId);
      if (!client || !client.verifyClientSecret(clientSecret)) {
        throw new UnauthorizedException('客户端认证失败');
      }

      const user = await this.userService.findOneById(+userId);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      return { user, client };
    } catch (error) {
      await this.auditLogService.create({
        type: 'token',
        userId: 0,
        clientId,
        ip,
        result: 'fail',
        errorMsg: error.message,
      });
      throw error;
    }
  }

  /**
   * 使用刷新令牌刷新令牌
   * @param refreshToken
   * @param clientId
   * @param clientSecret
   * @param ip
   */

  async refreshToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string,
    ip: string,
  ) {
    try {
      // 1. 验证刷新令牌是否存在于Redis
      const userIdStr = await this.redisClient.get(
        `refresh_token:${refreshToken}`,
      );
      if (!userIdStr) {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      const userId = parseInt(userIdStr, 10);

      // 2. 解析刷新令牌Payload，获取签发时的clientId
      let decodedPayload: any;
      try {
        decodedPayload = await this.jwtService.verifyAsync(refreshToken);
      } catch (e) {
        throw new UnauthorizedException('刷新令牌已过期或无效');
      }

      // 3. 校验请求的clientId是否与令牌签发时的clientId一致
      if (decodedPayload.clientId !== clientId) {
        throw new UnauthorizedException('刷新令牌与客户端不匹配');
      }

      // 4. 验证客户端密钥
      const client = await this.clientService.findOneByClientId(clientId);
      if (!client || !client.verifyClientSecret(clientSecret)) {
        throw new UnauthorizedException('客户端认证失败');
      }

      // 5. 获取用户信息
      const user = await this.userService.findOneById(userId);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 6. 原子操作：删除旧的刷新令牌并生成新的令牌
      const multi = this.redisClient.multi();
      multi.del(`refresh_token:${refreshToken}`);
      multi.srem(`user_refresh_tokens:${userId}`, refreshToken);
      await multi.exec();

      // 7. 生成新的令牌集
      return this.generateOidcTokens(user, client, ip);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 撤销令牌 (Access Token 或 Refresh Token)
   * @param token 要撤销的令牌
   * @param tokenTypeHint 令牌类型提示 (access_token, refresh_token)
   * @param clientId 客户端ID
   * @param clientSecret 客户端密钥
   * @param ip IP地址
   */
  async revokeToken(
    token: string,
    tokenTypeHint: string,
    clientId: string,
    clientSecret: string,
    ip: string,
  ) {
    try {
      const client = await this.clientService.findOneByClientId(clientId);
      if (!client || !client.verifyClientSecret(clientSecret)) {
        throw new UnauthorizedException('客户端认证失败');
      }
      let decodedPayload: any;
      try {
        decodedPayload = await this.jwtService.verifyAsync(token, {
          ignoreExpiration: true,
        });
      } catch (e) {
        throw new BadRequestException('无效的令牌');
      }

      if (decodedPayload.clientId !== clientId) {
        throw new UnauthorizedException('令牌与客户端不匹配');
      }

      const userId = decodedPayload.sub;
      const tokenKey =
        tokenTypeHint === 'refresh_token'
          ? `refresh_token:${token}`
          : `access_token_blacklist:${token}`;

      // 将令牌加入黑名单，并设置与令牌自身过期时间相同的TTL
      const expiryTime = decodedPayload.exp - Math.floor(Date.now() / 1000);
      if (expiryTime > 0) {
        await this.redisClient.set(tokenKey, 'revoked', 'EX', expiryTime);
        if (tokenTypeHint === 'refresh_token') {
          await this.redisClient.srem(`user_refresh_tokens:${userId}`, token);
        }
      }

      await this.auditLogService.create({
        type: 'revoke',
        userId: userId,
        clientId,
        ip,
        result: 'success',
      });
    } catch (error) {
      await this.auditLogService.create({
        type: 'revoke',
        userId: 0,
        clientId,
        ip,
        result: 'fail',
        errorMsg: error.message,
      });
      throw error;
    }
  }

  /**
   * 验证访问令牌并获取用户信息
   * @param accessToken 访问令牌
   */
  async verifyToken(accessToken: string): Promise<any> {
    try {
      // 1. 检查令牌是否在黑名单中
      const isRevoked = await this.redisClient.get(
        `access_token_blacklist:${accessToken}`,
      );
      if (isRevoked) {
        throw new UnauthorizedException('令牌已被撤销');
      }

      // 2. 验证令牌签名和有效期
      const payload = this.jwtService.verify(accessToken, {
        ignoreExpiration: true,
      });
      return payload;
    } catch (error) {
      throw new UnauthorizedException('无效的访问令牌');
    }
  }

  async logout(userId: number, ip: string) {
    try {
      // 1. 获取该用户所有的刷新令牌
      const refreshTokens = await this.redisClient.smembers(
        `user_refresh_tokens:${userId}`,
      );
      if (refreshTokens.length === 0) {
        return [];
      }

      // 2. 构建管道，批量删除刷新令牌
      const multi = this.redisClient.multi();
      refreshTokens.forEach((token) => multi.del(`refresh_token:${token}`));
      multi.del(`user_refresh_tokens:${userId}`);
      await multi.exec();

      await this.auditLogService.create({
        type: 'logout',
        userId,
        clientId: 'all',
        ip,
        result: 'success',
      });

      const clientIds = refreshTokens
        .map((token) => {
          try {
            return this.jwtService.verify(token, {
              ignoreExpiration: true,
            }).clientId;
          } catch (e) {
            return null;
          }
        })
        .filter((id) => id);

      const uniqueClientIds: string[] = [...new Set(clientIds)];
      const clients =
        await this.clientService.findClientsWithLogoutUri(uniqueClientIds);

      return clients
        .map((client) => client.frontChannelLogoutUri)
        .filter((uri) => uri);
    } catch (error) {
      await this.auditLogService.create({
        type: 'logout',
        userId,
        clientId: 'all',
        ip,
        result: 'fail',
        errorMsg: error.message,
      });
      throw error;
    }
  }

  /**
   * 解析JWT过期时间字符串为秒数
   * @param expiryStr 如 '1h', '7d'
   */
  private parseExpiryToSeconds(expiryStr: string): number {
    const match = expiryStr.match(/^(\d+)([hmsd])$/);
    if (!match)
      // 默认1小时
      return 3600;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      case 'm':
        return value * 60;
      case 's':
        return value;
      default:
        return 3600;
    }
  }
}
