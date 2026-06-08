import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import configuration from './config/configuration';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AuthModule } from './modules/auth/auth.module';
import { ForumModule } from './modules/forum/forum.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { StudentsModule } from './modules/students/students.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { AdminModule } from './modules/admin/admin.module';
import { PrincipalModule } from './modules/principal/principal.module';
import { TeacherModule } from './modules/teacher/teacher.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    NestScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    StudentsModule,
    SubjectsModule,
    AssignmentsModule,
    QuizzesModule,
    ForumModule,
    ScheduleModule,
    LeaderboardModule,
    NotificationsModule,
    UploadsModule,
    TeacherModule,
    AdminModule,
    PrincipalModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
