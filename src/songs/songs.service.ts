import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirestoreService } from '../firestore/firestore.service';
import { FriendsService } from '../friends/friends.service';
import { Song } from './entities/song.entity';
import { CreateSongDto, UpdateSongDto, ShareSongDto } from './dto/song.dto';

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
      name: createSongDto.name,
      artist: createSongDto.artist || null,
      description: createSongDto.description || null,
      bpm: createSongDto.bpm,
      timeSignature: createSongDto.timeSignature,
      sections: plainSections || [],
      sharedWith: createSongDto.sharedWith || [],
      createdAt: now,
      updatedAt: now,
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

    // Trasforma sections in oggetti plain se presenti
    const plainSections = updateSongDto.sections?.map(s => ({ name: s.name, bars: s.bars }));

    // Costruisci l'oggetto di aggiornamento
    const updatedData: Partial<Song> = {
      updatedAt: new Date(),
    };

    // Aggiungi solo i campi presenti nel DTO
    if (updateSongDto.name !== undefined) updatedData.name = updateSongDto.name;
    if (updateSongDto.artist !== undefined) updatedData.artist = updateSongDto.artist || null;
    if (updateSongDto.description !== undefined) updatedData.description = updateSongDto.description || null;
    if (updateSongDto.bpm !== undefined) updatedData.bpm = updateSongDto.bpm;
    if (updateSongDto.timeSignature !== undefined) updatedData.timeSignature = updateSongDto.timeSignature;
    if (updateSongDto.sections !== undefined) updatedData.sections = plainSections;
    if (updateSongDto.sharedWith !== undefined) updatedData.sharedWith = updateSongDto.sharedWith;

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