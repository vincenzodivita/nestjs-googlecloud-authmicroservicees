import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirestoreService } from '../firestore/firestore.service';
import { Song } from './entities/song.entity';
import { CreateSongDto, UpdateSongDto } from './dto/song.dto';

@Injectable()
export class SongsService {
  private readonly SONGS_COLLECTION = 'songs';

  constructor(private firestoreService: FirestoreService) {}

  async create(userId: string, createSongDto: CreateSongDto): Promise<Song> {
    const now = new Date();
    const songData: Omit<Song, 'id'> = {
      userId,
      ...createSongDto,
      createdAt: now,
      updatedAt: now,
    };

    const createdSong = await this.firestoreService.createDocument(
      this.SONGS_COLLECTION,
      songData,
    );

    return createdSong as Song;
  }

  async findAll(userId: string): Promise<Song[]> {
    const songs = await this.firestoreService.queryDocuments(
      this.SONGS_COLLECTION,
      'userId',
      '==',
      userId,
    );

    return songs as Song[];
  }

  async findOne(userId: string, id: string): Promise<Song> {
    const song = await this.firestoreService.getDocument(this.SONGS_COLLECTION, id) as Song;

    if (!song) {
      throw new NotFoundException('Brano non trovato');
    }

    if (song.userId !== userId) {
      throw new ForbiddenException('Non hai i permessi per accedere a questo brano');
    }

    return song;
  }

  async update(userId: string, id: string, updateSongDto: UpdateSongDto): Promise<Song> {
    const song = await this.findOne(userId, id);

    const updatedData = {
      ...updateSongDto,
      updatedAt: new Date(),
    };

    const updatedSong = await this.firestoreService.updateDocument(
      this.SONGS_COLLECTION,
      id,
      updatedData,
    );

    return { ...song, ...updatedSong } as Song;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.firestoreService.deleteDocument(this.SONGS_COLLECTION, id);
  }
}
