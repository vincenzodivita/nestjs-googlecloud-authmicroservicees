import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto, RespondFriendRequestDto } from './dto/friend.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  sendRequest(@Request() req, @Body() dto: SendFriendRequestDto) {
    return this.friendsService.sendFriendRequest(req.user.id, dto);
  }

  @Patch('request/:id')
  respondToRequest(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendsService.respondToFriendRequest(req.user.id, id, dto.status);
  }

  @Get('pending')
  getPendingRequests(@Request() req) {
    return this.friendsService.getPendingRequests(req.user.id);
  }

  @Get()
  getFriends(@Request() req) {
    return this.friendsService.getFriends(req.user.id);
  }

  @Delete(':id')
  removeFriend(@Request() req, @Param('id') id: string) {
    return this.friendsService.removeFriend(req.user.id, id);
  }
}
