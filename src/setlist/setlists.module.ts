import { Module } from '@nestjs/common';
import { SetlistsService } from './setlists.service';
import { SetlistsController } from './setlists.controller';
import { FirestoreModule } from '../firestore/firestore.module';
import { SongsModule } from '../songs/songs.module';

@Module({
  imports: [FirestoreModule, SongsModule],
  controllers: [SetlistsController],
  providers: [SetlistsService],
})
export class SetlistsModule {}
