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
    const songData: Omit<Song, 'id'> = {
      userId,
      ...createSongDto,
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
    // Ottieni i brani creati dall'utente
    const ownSongs = await this.firestoreService.queryDocuments(
      this.SONGS_COLLECTION,
      'userId',
      '==',
      userId,
    );

    // Ottieni i brani condivisi con l'utente
    // Nota: Firestore non supporta array-contains direttamente nelle query,
    // quindi dobbiamo recuperare tutti i brani e filtrare localmente
    // In produzione, considera l'uso di un indice composito o una struttura dati diversa
    const allSongs = await this.getAllSongsSharedWithUser(userId);

    // Combina e rimuovi duplicati
    const songMap = new Map();
    [...ownSongs, ...allSongs].forEach(song => {
      songMap.set(song.id, song);
    });

    return Array.from(songMap.values()) as Song[];
  }

  async findOne(userId: string, id: string): Promise<Song> {
    const song = await this.firestoreService.getDocument(this.SONGS_COLLECTION, id) as Song;

    if (!song) {
      throw new NotFoundException('Brano non trovato');
    }

    // Verifica che l'utente sia il creatore O che il brano sia condiviso con lui
    if (song.userId !== userId && !song.sharedWith.includes(userId)) {
      throw new ForbiddenException('Non hai i permessi per accedere a questo brano');
    }

    return song;
  }

  async update(userId: string, id: string, updateSongDto: UpdateSongDto): Promise<Song> {
    const song = await this.findOne(userId, id);

    // Solo il creatore può modificare
    if (song.userId !== userId) {
      throw new ForbiddenException('Solo il creatore può modificare questo brano');
    }

    // Verifica che gli utenti con cui condividere siano amici
    if (updateSongDto.sharedWith && updateSongDto.sharedWith.length > 0) {
      await this.validateSharedUsers(userId, updateSongDto.sharedWith);
    }

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
    const song = await this.findOne(userId, id);

    // Solo il creatore può eliminare
    if (song.userId !== userId) {
      throw new ForbiddenException('Solo il creatore può eliminare questo brano');
    }

    await this.firestoreService.deleteDocument(this.SONGS_COLLECTION, id);
  }

  async shareSong(userId: string, songId: string, dto: ShareSongDto): Promise<Song> {
    const song = await this.findOne(userId, songId);

    // Solo il creatore può condividere
    if (song.userId !== userId) {
      throw new ForbiddenException('Solo il creatore può condividere questo brano');
    }

    // Verifica che gli utenti siano amici
    await this.validateSharedUsers(userId, dto.userIds);

    // Aggiorna la lista di condivisione
    const updatedSharedWith = [...new Set([...song.sharedWith, ...dto.userIds])];

    return this.update(userId, songId, { sharedWith: updatedSharedWith });
  }

  async unshareSong(userId: string, songId: string, targetUserId: string): Promise<Song> {
    const song = await this.findOne(userId, songId);

    // Solo il creatore può rimuovere la condivisione
    if (song.userId !== userId) {
      throw new ForbiddenException('Solo il creatore può rimuovere la condivisione');
    }

    const updatedSharedWith = song.sharedWith.filter(id => id !== targetUserId);

    return this.update(userId, songId, { sharedWith: updatedSharedWith });
  }

  // Verifica che gli utenti siano tutti amici
  private async validateSharedUsers(userId: string, userIds: string[]): Promise<void> {
    for (const targetUserId of userIds) {
      const areFriends = await this.friendsService.areFriends(userId, targetUserId);
      if (!areFriends) {
        throw new ForbiddenException(`Non puoi condividere con utenti che non sono tuoi amici`);
      }
    }
  }

  // Helper per ottenere tutti i brani condivisi con un utente
  // Nota: Questa è una query inefficiente - in produzione considera un indice separato
  private async getAllSongsSharedWithUser(userId: string): Promise<any[]> {
    // Ottieni tutti i brani (limitato) e filtra localmente
    // In produzione, usa un indice o una collection separata per le condivisioni
    const firestore = this.firestoreService.getFirestore();
    const snapshot = await firestore.collection(this.SONGS_COLLECTION).get();
    
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((song: any) => song.sharedWith && song.sharedWith.includes(userId));
  }
}