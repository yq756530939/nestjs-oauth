import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import {
  Request,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Ip,
  NotFoundException,
  Post,
  Query,
  Render,
  UseGuards,
} from '@nestjs/common';
import { ClientService } from 'src/client/services/client.service';
import { LoginDto } from 'src/user/dto/login.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('认证中心 (OAuth2.0/OIDC)')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly clientService: ClientService,
  ) {}

  @Get('oauth/authorize')
  @ApiOperation({ summary: '授权端点' })
  async authorize(@Query() query: any) {
    const { client_id, redirect_uri, response_type, state } = query;
    if (!client_id || !redirect_uri || response_type !== 'code') {
      return this.redirectWithError(
        redirect_uri,
        'invalid_request',
        '无效的请求参数',
        state,
      );
    }

    const client = await this.clientService.findOneByClientId(client_id);
    if (!client)
      return this.redirectWithError(
        redirect_uri,
        'invalid_client',
        '客户端不存在',
        state,
      );

    if (!client.redirectUris.includes(redirect_uri)) {
      return this.redirectWithError(
        redirect_uri,
        'invalid_redirect_uri',
        '重定向URI不合法',
        state,
      );
    }

    return {
      redirectUrl: `/login?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`,
    };
  }

  @Get('login')
  @Render('login')
  loginPage(@Query() query: any) {
    return {
      clientId: query.client_id,
      redirectUri: query.redirect_uri,
      state: query.state,
      error: query.error,
    };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    const { username, password, client_id, redirect_uri, state } = dto;

    try {
      const user = await this.authService.validateUser(username, password, ip);
      const authCode = await this.authService.generateAuthCode(
        user,
        client_id,
        ip,
      );
      return {
        redirectUrl: `${redirect_uri}?code=${authCode}&state=${state || ''}`,
      };
    } catch (err) {
      return {
        redirectUrl: `/login?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}&error=${encodeURIComponent(err.message)}`,
      };
    }
  }

  @Post('oauth/token')
  @HttpCode(200)
  @Header('Content-Type', 'application/json')
  @ApiOperation({ summary: '令牌端点' })
  async getToken(@Body() body: any, @Ip() ip: string) {
    const { grant_type, code, client_id, client_secret, refresh_token } = body;

    try {
      switch (grant_type) {
        case 'authorization_code':
          const { user, client } = await this.authService.verifyAuthCode(
            code,
            client_id,
            client_secret,
            ip,
          );
          return this.authService.generateOidcTokens(user, client, ip);
        case 'refresh_token':
          return this.authService.refreshToken(
            refresh_token,
            client_id,
            client_secret,
            ip,
          );
        default:
          throw new Error('不支持的授权类型');
      }
    } catch (error) {
      throw error;
    }
  }

  @Get('oauth/userinfo')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '用户信息端点' })
  async userInfo(@Request() req: any) {
    const user = await this.authService.userService.findOneById(req.user.sub);
    if (!user) throw new NotFoundException('用户不存在');
    return {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    };
  }

  @Post('oauth/revoke')
  @HttpCode(200)
  @ApiOperation({ summary: '令牌撤销端点' })
  async revoke(@Body() body: any, @Ip() ip: string) {
    const { token, token_type_hint, client_id, client_secret } = body;
    await this.authService.revokeToken(
      token,
      token_type_hint,
      client_id,
      client_secret,
      ip,
    );
    return {};
  }

  @Get('logout')
  @ApiOperation({ summary: '全局登出端点' })
  async logout(@Query() query: any, @Ip() ip: string) {
    const { token } = query;
    if (!token) {
      return { logoutUrls: [] };
    }
    try {
      const payload = await this.authService.verifyToken(token);
      const logoutUrls = await this.authService.logout(payload.sub, ip);
      return { logoutUrls };
    } catch (error) {
      return { logoutUrls: [] };
    }
  }

  private redirectWithError(
    redirectUri: string,
    error: string,
    errorDesc: string,
    state?: string,
  ) {
    let url = `${redirectUri}?error=${error}&error_description=${encodeURIComponent(errorDesc)}`;
    if (state) {
      url += `&state=${state}`;
    }
    return {
      redirectUrl: url,
    };
  }
}
