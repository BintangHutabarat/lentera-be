import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrincipalController } from './principal.controller';
import { PrincipalService } from './principal.service';

@Module({
  imports: [PrismaModule],
  controllers: [PrincipalController],
  providers: [PrincipalService],
})
export class PrincipalModule {}
