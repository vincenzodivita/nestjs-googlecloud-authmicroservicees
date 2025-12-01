import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { FirestoreService } from '../firestore/firestore.service';
import { Friendship, FriendshipStatus, FriendWithUser } from './entities/friend.entity';
import { SendFriendRequestDto } from './dto/friend.dto';
import { User, UserResponse } from '../auth/entities/user.entity';


@Injectable()
export class FriendsService {
  private readonly FRIENDSHIPS_COLLECTION = 'friendships';
  private readonly USERS_COLLECTION = 'users';

  constructor(private firestoreService: FirestoreService) {}

  async sendFriendRequest(senderId: string, dto: SendFriendRequestDto): Promise<Friendship> {
    // Cerca l'utente per email
    const users = await this.firestoreService.queryDocuments(
      this.USERS_COLLECTION,
      'email',
      '==',
      dto.identifier,
    );

    if (users.length === 0) {
      throw new NotFoundException('Utente non trovato');
    }

    const receiver = users[0];
    const receiverId = receiver.id;

    if (senderId === receiverId) {
      throw new BadRequestException('Non puoi inviare una richiesta di amicizia a te stesso');
    }

    // Controlla se esiste già una richiesta
    const existingRequests = await this.firestoreService.queryDocuments(
      this.FRIENDSHIPS_COLLECTION,
      'senderId',
      '==',
      senderId,
    );

    const existingRequest = existingRequests.find(
      (req: any) => req.receiverId === receiverId && req.status === FriendshipStatus.PENDING
    );

    if (existingRequest) {
      throw new ConflictException('Richiesta di amicizia già inviata');
    }

    // Controlla se esiste già un'amicizia
    const existingFriendships = await this.getFriendship(senderId, receiverId);
    if (existingFriendships.length > 0) {
      const friendship = existingFriendships[0];
      if (friendship.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('Siete già amici');
      }
    }

    const now = new Date();
    const friendshipData: Omit<Friendship, 'id'> = {
      senderId,
      receiverId,
      status: FriendshipStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    };

    const createdFriendship = await this.firestoreService.createDocument(
      this.FRIENDSHIPS_COLLECTION,
      friendshipData,
    );

    return createdFriendship as Friendship;
  }

  async respondToFriendRequest(
    userId: string,
    requestId: string,
    status: FriendshipStatus,
  ): Promise<Friendship> {
    const friendship = await this.firestoreService.getDocument(
      this.FRIENDSHIPS_COLLECTION,
      requestId,
    ) as Friendship;

    if (!friendship) {
      throw new NotFoundException('Richiesta di amicizia non trovata');
    }

    if (friendship.receiverId !== userId) {
      throw new BadRequestException('Non puoi rispondere a questa richiesta');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException('Questa richiesta è già stata gestita');
    }

    const updatedFriendship = await this.firestoreService.updateDocument(
      this.FRIENDSHIPS_COLLECTION,
      requestId,
      {
        status,
        updatedAt: new Date(),
      },
    );

    return { ...friendship, ...updatedFriendship } as Friendship;
  }

  async getPendingRequests(userId: string): Promise<FriendWithUser[]> {
    // Richieste ricevute
    const requests = await this.firestoreService.queryDocuments(
      this.FRIENDSHIPS_COLLECTION,
      'receiverId',
      '==',
      userId,
    );

    const pendingRequests = requests.filter(
      (req: Friendship) => req.status === FriendshipStatus.PENDING
    );

    // Ottieni info degli utenti che hanno inviato la richiesta
    const friendsWithUsers = await Promise.all(
      pendingRequests.map(async (request: Friendship) => {
        const sender = await this.firestoreService.getDocument<User>(
          this.USERS_COLLECTION,
          request.senderId,
        );

        if (!sender) {
          throw new NotFoundException('Utente non trovato');
        }

        return {
          id: request.id,
          userId: sender.id!,
          email: sender.email,
          name: sender.name,
          status: request.status,
          createdAt: request.createdAt,
        };
      })
  );

  return friendsWithUsers;
}

  async getFriends(userId: string): Promise<FriendWithUser[]> {
    // Ottieni tutte le amicizie accettate (sia come sender che receiver)
    const sentFriendships = await this.firestoreService.queryDocuments(
      this.FRIENDSHIPS_COLLECTION,
      'senderId',
      '==',
      userId,
    );

    const receivedFriendships = await this.firestoreService.queryDocuments(
      this.FRIENDSHIPS_COLLECTION,
      'receiverId',
      '==',
      userId,
    );

    const allFriendships = [...sentFriendships, ...receivedFriendships].filter(
      (friendship: Friendship) => friendship.status === FriendshipStatus.ACCEPTED
    );

    // Ottieni info degli amici
    const friendsWithUsers = await Promise.all(
      allFriendships.map(async (friendship: Friendship) => {
        const friendId =
          friendship.senderId === userId ? friendship.receiverId : friendship.senderId;

        const friend = await this.firestoreService.getDocument<User>(
          this.USERS_COLLECTION,
          friendId,
        );

        if (!friend) {
          throw new NotFoundException('Utente non trovato');
        }

        return {
          id: friendship.id,
          userId: friend.id!,
          email: friend.email,
          name: friend.name,
          status: friendship.status,
          createdAt: friendship.createdAt,
        };
      })
    );

    return friendsWithUsers;
  }


  async removeFriend(userId: string, friendshipId: string): Promise<void> {
    const friendship = await this.firestoreService.getDocument(
      this.FRIENDSHIPS_COLLECTION,
      friendshipId,
    ) as Friendship;

    if (!friendship) {
      throw new NotFoundException('Amicizia non trovata');
    }

    if (friendship.senderId !== userId && friendship.receiverId !== userId) {
      throw new BadRequestException('Non puoi rimuovere questa amicizia');
    }

    await this.firestoreService.deleteDocument(this.FRIENDSHIPS_COLLECTION, friendshipId);
  }

  // Helper per controllare se due utenti sono amici
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendships = await this.getFriendship(userId1, userId2);
    return friendships.some((f: any) => f.status === FriendshipStatus.ACCEPTED);
  }

  private async getFriendship(userId1: string, userId2: string): Promise<any[]> {
    const sentFriendships = await this.firestoreService.queryDocuments(
      this.FRIENDSHIPS_COLLECTION,
      'senderId',
      '==',
      userId1,
    );

    const receivedFriendships = await this.firestoreService.queryDocuments(
      this.FRIENDSHIPS_COLLECTION,
      'receiverId',
      '==',
      userId1,
    );

    const allFriendships = [...sentFriendships, ...receivedFriendships];

    return allFriendships.filter(
      (f: any) =>
        (f.senderId === userId1 && f.receiverId === userId2) ||
        (f.senderId === userId2 && f.receiverId === userId1)
    );
  }
}
