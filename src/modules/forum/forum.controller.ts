import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ForumService } from './forum.service';

@ApiTags('forum')
@ApiBearerAuth()
@Controller('forum')
export class ForumController {
  constructor(private forumService: ForumService) {}

  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'subject', required: false })
  @Get('posts')
  getPosts(
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('subject') subject?: string,
  ) {
    return this.forumService.getPosts(user.id, cursor, limit ? parseInt(limit) : 20, subject);
  }

  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  createPost(@CurrentUser() user: { id: string }, @Body() dto: CreatePostDto) {
    return this.forumService.createPost(user.id, dto);
  }

  @Get('posts/:id')
  getPost(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.forumService.getPost(user.id, id);
  }

  @Post('posts/:id/reply')
  @HttpCode(HttpStatus.CREATED)
  addReply(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CreateReplyDto,
  ) {
    return this.forumService.addReply(user.id, id, dto);
  }

  @Post('posts/:id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  like(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.forumService.like(user.id, id);
  }

  @Delete('posts/:id/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlike(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.forumService.unlike(user.id, id);
  }

  @Post('posts/:id/save')
  @HttpCode(HttpStatus.NO_CONTENT)
  save(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.forumService.save(user.id, id);
  }

  @Delete('posts/:id/save')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsave(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.forumService.unsave(user.id, id);
  }

  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Get('me/saved')
  getSavedPosts(
    @CurrentUser() user: { id: string },
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.forumService.getSavedPosts(user.id, cursor, limit ? parseInt(limit) : 20);
  }
}
