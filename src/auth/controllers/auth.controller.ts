import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import {
  Body,
  Controller,
  Get,
  Ip,
  NotFoundException,
  Post,
  Query,
  Render,
} from '@nestjs/common';
import { ClientService } from 'src/client/services/client.service';
import { LoginDto } from 'src/user/dto/login.dto';

@ApiTags('认证管理')
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly clientService: ClientService,
  ) {}

  @Get('login')
  @Render('login')
  loginPage(@Query() query: any) {
    return {
      clientId: query.client_id,
      redirectUri: query.redirect_uri,
      error: query.error,
    };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    const client = await this.clientService.findOneByClientId(dto.client_id);
    if (!client) throw new NotFoundException('客户端不存在');

    const isValidRedirect = await this.clientService.validateRedirectUri(
      dto.client_id,
      dto.redirect_uri,
    );
    if (!isValidRedirect) throw new Error('重定向URI不合法');

    const user = await this.authService.validateUser(
      dto.username,
      dto.password,
      ip,
    );

    const authCode = await this.authService.generateAuthCode(
      user,
      dto.client_id,
      ip,
    );

    return {
      redirectUrl: `${dto.redirect_uri}?code=${authCode}`,
    };
  }

  @Post('oauth/token')
  async getToken(@Body() body: any, @Ip() ip: string) {
    const { code, client_id, client_secret, grant_type, refresh_token } = body;

    if (grant_type === 'refresh_token') {
      return this.authService.refreshToken(refresh_token, ip);
    }
  }
}
