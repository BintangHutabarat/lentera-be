import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PresignDto } from './dto/presign.dto';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  presign(@CurrentUser() user: { id: string }, @Body() dto: PresignDto) {
    return this.uploadsService.presign(user.id, dto);
  }
}
