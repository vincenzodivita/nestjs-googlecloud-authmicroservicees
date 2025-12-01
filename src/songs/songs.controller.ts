import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { SongsService } from './songs.service';
import { CreateSongDto, UpdateSongDto, ShareSongDto } from './dto/song.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('songs')
@UseGuards(JwtAuthGuard)
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Post()
  create(@Request() req, @Body() createSongDto: CreateSongDto) {
    return this.songsService.create(req.user.id, createSongDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.songsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.songsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateSongDto: UpdateSongDto) {
    return this.songsService.update(req.user.id, id, updateSongDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.songsService.remove(req.user.id, id);
  }

  @Post(':id/share')
  shareSong(@Request() req, @Param('id') id: string, @Body() dto: ShareSongDto) {
    return this.songsService.shareSong(req.user.id, id, dto);
  }

  @Delete(':id/share/:userId')
  unshareSong(@Request() req, @Param('id') id: string, @Param('userId') userId: string) {
    return this.songsService.unshareSong(req.user.id, id, userId);
  }
}