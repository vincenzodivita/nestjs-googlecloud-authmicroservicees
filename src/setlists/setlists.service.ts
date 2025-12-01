import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirestoreService } from '../firestore/firestore.service';
import { SongsService } from '../songs/songs.service';
import { Setlist } from './entities/setlist.entity';
import { CreateSetlistDto, UpdateSetlistDto } from './dto/setlist.dto';

@Injectable()
export class SetlistsService {
  private readonly SETLISTS_COLLECTION = 'setlists';

  constructor(
    private firestoreService: FirestoreService,
    private songsService: SongsService,
  ) {}

  async create(userId: string, createSetlistDto: CreateSetlistDto): Promise<Setlist> {
    const now = new Date();
    const setlistData: Omit<Setlist, 'id'> = {
      userId,
      ...createSetlistDto,
      sharedWith: createSetlistDto.sharedWith || [],
      songs: [],
      createdAt: now,
      updatedAt: now,
    };

    const createdSetlist = await this.firestoreService.createDocument(
      this.SETLISTS_COLLECTION,
      setlistData,
    );

    return createdSetlist as Setlist;
  }

  async findAll(userId: string): Promise<Setlist[]> {
    const setlists = await this.firestoreService.queryDocuments(
      this.SETLISTS_COLLECTION,
      'userId',
      '==',
      userId,
    );

    return setlists as Setlist[];
  }

  async findOne(userId: string, id: string): Promise<Setlist> {
    const setlist = await this.firestoreService.getDocument(
      this.SETLISTS_COLLECTION,
      id,
    ) as Setlist;

    if (!setlist) {
      throw new NotFoundException('Setlist non trovata');
    }

    if (setlist.userId !== userId) {
      throw new ForbiddenException('Non hai i permessi per accedere a questa setlist');
    }

    return setlist;
  }

  async update(userId: string, id: string, updateSetlistDto: UpdateSetlistDto): Promise<Setlist> {
    const setlist = await this.findOne(userId, id);

    const updatedData = {
      ...updateSetlistDto,
      updatedAt: new Date(),
    };

    const updatedSetlist = await this.firestoreService.updateDocument(
      this.SETLISTS_COLLECTION,
      id,
      updatedData,
    );

    return { ...setlist, ...updatedSetlist } as Setlist;
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.firestoreService.deleteDocument(this.SETLISTS_COLLECTION, id);
  }

  async addSong(userId: string, setlistId: string, songId: string): Promise<Setlist> {
    const setlist = await this.findOne(userId, setlistId);
    
    // Verify that the song exists and belongs to the user
    await this.songsService.findOne(userId, songId);

    // Check if song is already in setlist
    if (setlist.songs.includes(songId)) {
      return setlist;
    }

    const updatedSongs = [...setlist.songs, songId];

    return this.update(userId, setlistId, { songs: updatedSongs });
  }

  async removeSong(userId: string, setlistId: string, songId: string): Promise<Setlist> {
    const setlist = await this.findOne(userId, setlistId);

    const updatedSongs = setlist.songs.filter(id => id !== songId);

    return this.update(userId, setlistId, { songs: updatedSongs });
  }

  async reorderSongs(userId: string, setlistId: string, songIds: string[]): Promise<Setlist> {
    const setlist = await this.findOne(userId, setlistId);

    // Verify all songs belong to the setlist
    const allSongsValid = songIds.every(id => setlist.songs.includes(id));
    if (!allSongsValid || songIds.length !== setlist.songs.length) {
      throw new ForbiddenException('Invalid song order');
    }

    return this.update(userId, setlistId, { songs: songIds });
  }

async shareSetlist(userId: string, setlistId: string, dto: { userIds: string[] }): Promise<Setlist> {
  const setlist = await this.findOne(userId, setlistId);

  // Se non esiste il campo sharedWith, lo inizializza
  if (!setlist.sharedWith) {
    setlist.sharedWith = [];
  }

  // Aggiunge solo userIds non già presenti
  const updatedSharedWith = Array.from(new Set([...setlist.sharedWith, ...dto.userIds]));

  return this.update(userId, setlistId, { sharedWith: updatedSharedWith });
}

async unshareSetlist(userId: string, setlistId: string, removeUserId: string): Promise<Setlist> {
  const setlist = await this.findOne(userId, setlistId);

  if (!setlist.sharedWith || !setlist.sharedWith.includes(removeUserId)) {
    throw new NotFoundException('Questo utente non ha accesso alla setlist');
  }

  const updatedSharedWith = setlist.sharedWith.filter(id => id !== removeUserId);

  return this.update(userId, setlistId, { sharedWith: updatedSharedWith });
}


}