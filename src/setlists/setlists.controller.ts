import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { SetlistsService } from './setlists.service';
import { CreateSetlistDto, UpdateSetlistDto, AddSongToSetlistDto, ReorderSongsDto, ShareSetlistDto } from './dto/setlist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('setlists')
@UseGuards(JwtAuthGuard)
export class SetlistsController {
  constructor(private readonly setlistsService: SetlistsService) {}

  @Post()
  create(@Request() req, @Body() createSetlistDto: CreateSetlistDto) {
    return this.setlistsService.create(req.user.id, createSetlistDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.setlistsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id') id: string) {
    return this.setlistsService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateSetlistDto: UpdateSetlistDto) {
    return this.setlistsService.update(req.user.id, id, updateSetlistDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.setlistsService.remove(req.user.id, id);
  }

  @Post(':id/songs')
  addSong(@Request() req, @Param('id') id: string, @Body() addSongDto: AddSongToSetlistDto) {
    return this.setlistsService.addSong(req.user.id, id, addSongDto.songId);
  }

  @Delete(':id/songs/:songId')
  removeSong(@Request() req, @Param('id') id: string, @Param('songId') songId: string) {
    return this.setlistsService.removeSong(req.user.id, id, songId);
  }

  @Patch(':id/reorder')
  reorderSongs(@Request() req, @Param('id') id: string, @Body() reorderDto: ReorderSongsDto) {
    return this.setlistsService.reorderSongs(req.user.id, id, reorderDto.songIds);
  }

  @Post(':id/share')
  shareSetlist(@Request() req, @Param('id') id: string, @Body() dto: ShareSetlistDto) {
    return this.setlistsService.shareSetlist(req.user.id, id, dto);
  }

  @Delete(':id/share/:userId')
  unshareSetlist(@Request() req, @Param('id') id: string, @Param('userId') userId: string) {
    return this.setlistsService.unshareSetlist(req.user.id, id, userId);
  }
}