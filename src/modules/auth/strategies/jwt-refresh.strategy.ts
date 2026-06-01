import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['lentera.refresh'] ?? null,
      ]),
      secretOrKey: configService.get<string>('jwt.refreshSecret')!,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const token = req?.cookies?.['lentera.refresh'];
    if (!token) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Refresh token tidak ditemukan' });
    }
    return { ...payload, refreshToken: token };
  }
}
