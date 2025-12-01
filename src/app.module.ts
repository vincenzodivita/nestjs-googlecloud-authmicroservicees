import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { FirestoreModule } from './firestore/firestore.module';
import { FriendsModule } from './friends/friends.module';
import { SongsModule } from './songs/songs.module';
import { SetlistsModule } from './setlists/setlists.module';

@Module({
  imports: [
    FirestoreModule,
    AuthModule,
    FriendsModule,
    SongsModule,
    SetlistsModule,
  ],
})
export class AppModule {}