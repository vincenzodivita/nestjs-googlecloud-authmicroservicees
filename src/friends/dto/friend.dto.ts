import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { FriendshipStatus } from '../entities/friend.entity';

export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  identifier: string; // può essere email o username
}

export class RespondFriendRequestDto {
  @IsEnum(FriendshipStatus)
  status: FriendshipStatus.ACCEPTED | FriendshipStatus.REJECTED;
}
