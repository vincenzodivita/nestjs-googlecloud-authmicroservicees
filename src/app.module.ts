import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { FirestoreModule } from './firestore/firestore.module';

@Module({
  imports: [FirestoreModule, AuthModule],
})
export class AppModule {}
