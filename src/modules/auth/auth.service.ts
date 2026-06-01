import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { StaffLoginDto } from './dto/staff-login.dto';
import { StudentLoginDto } from './dto/student-login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async studentLogin(dto: StudentLoginDto, res: Response) {
    const student = await this.prisma.student.findUnique({
      where: { nis: dto.nis },
      include: { user: true, class: true },
    });

    if (!student) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'NIS atau password salah' });
    }

    await this.verifyPassword(student.user.passwordHash, dto.password);
    this.assertActive(student.user.isActive);

    await this.prisma.user.update({
      where: { id: student.userId },
      data: { lastLoginAt: new Date() },
    });

    const school = await this.prisma.school.findUnique({ where: { id: student.user.schoolId } });
    const accessToken = await this.generateTokens(student.userId, Role.STUDENT, res);

    return {
      accessToken,
      user: {
        id: student.userId,
        role: Role.STUDENT,
        mustChangePassword: student.user.mustChangePassword,
        profile: {
          name: student.name,
          nis: student.nis,
          class: student.class.name,
          school: school?.name,
          level: student.level,
          xp: student.xp,
          xpMax: this.calcXpMax(student.level),
          avatar: student.avatar,
        },
      },
    };
  }

  async staffLogin(dto: StaffLoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { teacher: true, admin: true, school: true },
    });

    if (!user || (user.role !== Role.TEACHER && user.role !== Role.ADMIN)) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Email atau password salah' });
    }

    await this.verifyPassword(user.passwordHash, dto.password);
    this.assertActive(user.isActive);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.generateTokens(user.id, user.role, res);

    let profile: Record<string, any>;
    if (user.role === Role.TEACHER && user.teacher) {
      profile = {
        name: user.teacher.name,
        nip: user.teacher.nip,
        title: user.teacher.title,
        school: user.school.name,
        avatar: user.teacher.avatar,
      };
    } else {
      profile = {
        name: user.admin!.name,
        scope: user.admin!.scope,
        school: user.school.name,
      };
    }

    return {
      accessToken,
      user: {
        id: user.id,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        profile,
      },
    };
  }

  async logout(userId: string, refreshToken: string, res: Response) {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.deleteMany({ where: { userId, tokenHash } });
    }
    res.clearCookie('lentera.refresh');
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: { include: { class: true } },
        teacher: true,
        admin: true,
        school: true,
      },
    });

    if (!user) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'User tidak ditemukan' });

    if (user.role === Role.STUDENT && user.student) {
      return {
        id: user.id,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        profile: {
          name: user.student.name,
          nis: user.student.nis,
          class: user.student.class.name,
          school: user.school.name,
          level: user.student.level,
          xp: user.student.xp,
          xpMax: this.calcXpMax(user.student.level),
          avatar: user.student.avatar,
        },
      };
    }

    if (user.role === Role.TEACHER && user.teacher) {
      return {
        id: user.id,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        profile: {
          name: user.teacher.name,
          nip: user.teacher.nip,
          title: user.teacher.title,
          school: user.school.name,
          avatar: user.teacher.avatar,
        },
      };
    }

    if (user.role === Role.ADMIN && user.admin) {
      return {
        id: user.id,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        profile: {
          name: user.admin.name,
          scope: user.admin.scope,
          school: user.school.name,
        },
      };
    }

    throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'Profil tidak ditemukan' });
  }

  async changePassword(userId: string, dto: ChangePasswordDto, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException({ code: 'UNAUTHENTICATED', message: 'User tidak ditemukan' });

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new UnauthorizedException({ code: 'CURRENT_PASSWORD_WRONG', message: 'Password saat ini salah' });
    }

    const newHash = await argon2.hash(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, mustChangePassword: false },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    res.clearCookie('lentera.refresh');
  }

  async refreshTokens(userId: string, role: Role, rawRefreshToken: string, res: Response) {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.userId !== userId || stored.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'INVALID_REFRESH_TOKEN', message: 'Refresh token tidak valid' });
    }

    await this.prisma.refreshToken.delete({ where: { tokenHash } });
    const accessToken = await this.generateTokens(userId, role, res);
    return { accessToken };
  }

  private async generateTokens(userId: string, role: Role, res: Response): Promise<string> {
    const accessToken = this.jwtService.sign(
      { sub: userId, role },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn') as any,
      },
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });

    res.cookie('lentera.refresh', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('nodeEnv') === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return accessToken;
  }

  private async verifyPassword(hash: string, plain: string) {
    const valid = await argon2.verify(hash, plain);
    if (!valid) {
      throw new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'NIS/email atau password salah' });
    }
  }

  private assertActive(isActive: boolean) {
    if (!isActive) {
      throw new ForbiddenException({ code: 'ACCOUNT_DISABLED', message: 'Akun dinonaktifkan' });
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private calcXpMax(level: number): number {
    return 1000 + level * 100;
  }
}
