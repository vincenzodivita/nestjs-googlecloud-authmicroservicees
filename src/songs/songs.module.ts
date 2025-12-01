import { Module } from '@nestjs/common';
import { SongsService } from './songs.service';
import { SongsController } from './songs.controller';
import { FirestoreModule } from '../firestore/firestore.module';
import { FriendsModule } from '../friends/friends.module';

@Module({
  imports: [FirestoreModule, FriendsModule],
  controllers: [SongsController],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}