import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirestoreService } from '../firestore/firestore.service';
import { FriendsService } from '../friends/friends.service';
import { Song } from './entities/song.entity';
import { CreateSongDto, UpdateSongDto, ShareSongDto, SongSectionDto } from './dto/song.dto';

@Injectable()
export class SongsService {
  private readonly SONGS_COLLECTION = 'songs';

  constructor(
    private firestoreService: FirestoreService,
    private friendsService: FriendsService,
  ) {}

  async create(userId: string, createSongDto: CreateSongDto): Promise<Song> {
    const now = new Date();

    // Trasforma sections in oggetti plain
    const plainSections = createSongDto.sections?.map(s => ({ name: s.name, bars: s.bars }));

    const songData: Omit<Song, 'id'> = {
      userId,
      ...createSongDto,
      sharedWith: createSongDto.sharedWith || [],
      createdAt: now,
      updatedAt: now,
      sections: plainSections,
    };

    // Verifica che gli utenti con cui condividere siano amici
    if (songData.sharedWith.length > 0) {
      await this.validateSharedUsers(userId, songData.sharedWith);
    }

    const createdSong = await this.firestoreService.createDocument(
      this.SONGS_COLLECTION,
      songData,
    );

    return createdSong as Song;
  }

  async findAll(userId: string): Promise<Song[]> {
    const ownSongs = await this.firestoreService.queryDocuments(
      this.SONGS_COLLECTION,
      'userId',
      '==',
      userId,
    );

    const sharedSongs = await this.getAllSongsSharedWithUser(userId);

    const songMap = new Map();
    [...ownSongs, ...sharedSongs].forEach(song => {
      songMap.set(song.id, song);
    });

    return Array.from(songMap.values()) as Song[];
  }

  async findOne(userId: string, id: string): Promise<Song> {
    const song = await this.firestoreService.getDocument(this.SONGS_COLLECTION, id) as Song;

    if (!song) throw new NotFoundException('Brano non trovato');

    if (song.userId !== userId && !song.sharedWith.includes(userId)) {
      throw new ForbiddenException('Non hai i permessi per accedere a questo brano');
    }

    return song;
  }

  async update(userId: string, id: string, updateSongDto: UpdateSongDto): Promise<Song> {
    const song = await this.findOne(userId, id);

    if (song.userId !== userId) {
      throw new ForbiddenException('Solo il creatore può modificare questo brano');
    }

    if (updateSongDto.sharedWith && updateSongDto.sharedWith.length > 0) {
      await this.validateSharedUsers(userId, updateSongDto.sharedWith);
    }

    // Trasforma sections in oggetti plain
    const plainSections = updateSongDto.sections?.map(s => ({ name: s.name, bars: s.bars }));

    const updatedData = {
      ...updateSongDto,
      updatedAt: new Date(),
      sections: plainSections,
    };

    const updatedSong = await this.firestoreService.updateDocument(
      this.SONGS_COLLECTION,
      id,
      updatedData,
    );

    return { ...song, ...updatedSong } as Song;
  }

  async remove(userId: string, id: string): Promise<void> {
    const song = await this.findOne(userId, id);

    if (song.userId !== userId) {
      throw new ForbiddenException('Solo il creatore può eliminare questo brano');
    }

    await this.firestoreService.deleteDocument(this.SONGS_COLLECTION, id);
  }

  async shareSong(userId: string, songId: string, dto: ShareSongDto): Promise<Song> {
    const song = await this.findOne(userId, songId);

    if (song.userId !== userId) {
      throw new ForbiddenException('Solo il creatore può condividere questo brano');
    }

    await this.validateSharedUsers(userId, dto.userIds);

    const updatedSharedWith = [...new Set([...song.sharedWith, ...dto.userIds])];

    return this.update(userId, songId, { sharedWith: updatedSharedWith });
  }

  async unshareSong(userId: string, songId: string, targetUserId: string): Promise<Song> {
    const song = await this.findOne(userId, songId);

    if (song.userId !== userId) {
      throw new ForbiddenException('Solo il creatore può rimuovere la condivisione');
    }

    const updatedSharedWith = song.sharedWith.filter(id => id !== targetUserId);

    return this.update(userId, songId, { sharedWith: updatedSharedWith });
  }

  private async validateSharedUsers(userId: string, userIds: string[]): Promise<void> {
    for (const targetUserId of userIds) {
      const areFriends = await this.friendsService.areFriends(userId, targetUserId);
      if (!areFriends) {
        throw new ForbiddenException(`Non puoi condividere con utenti che non sono tuoi amici`);
      }
    }
  }

  private async getAllSongsSharedWithUser(userId: string): Promise<any[]> {
    const firestore = this.firestoreService.getFirestore();
    const snapshot = await firestore.collection(this.SONGS_COLLECTION).get();

    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((song: any) => song.sharedWith && song.sharedWith.includes(userId));
  }
}
