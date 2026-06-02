import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsGateway } from '../../gateways/notifications.gateway';
import { ExportService } from './export.service';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';

@Module({
  imports: [PrismaModule, JwtModule],
  controllers: [TeacherController],
  providers: [TeacherService, ExportService, NotificationsGateway],
})
export class TeacherModule {}
