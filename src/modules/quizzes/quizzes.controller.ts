import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { QuizzesService } from './quizzes.service';

@ApiTags('quizzes')
@ApiBearerAuth()
@Roles(Role.STUDENT)
@Controller('quizzes')
export class QuizzesController {
  constructor(private quizzesService: QuizzesService) {}

  @Get()
  getQuizzes(@CurrentUser() user: { id: string }) {
    return this.quizzesService.getQuizzes(user.id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  startQuiz(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.quizzesService.startQuiz(user.id, id);
  }

  @Patch('sessions/:sessionId/answer')
  @HttpCode(HttpStatus.NO_CONTENT)
  saveAnswer(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.quizzesService.saveAnswer(user.id, sessionId, dto);
  }

  @Post('sessions/:sessionId/submit')
  @HttpCode(HttpStatus.OK)
  submitQuiz(
    @CurrentUser() user: { id: string },
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitQuizDto,
  ) {
    return this.quizzesService.submitQuiz(user.id, sessionId, dto);
  }

  @Get('sessions/:sessionId')
  getSession(@CurrentUser() user: { id: string }, @Param('sessionId') sessionId: string) {
    return this.quizzesService.getSession(user.id, sessionId);
  }
}
