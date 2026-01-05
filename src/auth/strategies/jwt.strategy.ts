import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt.secret'),
    });
  }

  async validate(payload: any) {
    await this.authService.verifyToken(this._jwtToken);
    return payload;
  }

  private _jwtToken: string;
  private _jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();

  authenticate(req) {
    this._jwtToken = this._jwtFromRequest(req);
    super.authenticate(req);
  }
}
