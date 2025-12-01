export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export interface Friendship {
  id?: string;
  senderId: string;      // Chi ha inviato la richiesta
  receiverId: string;    // Chi riceve la richiesta
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Per le response con info utente
export interface FriendWithUser {
  id: string;
  userId: string;
  email: string;
  name: string;
  status: FriendshipStatus;
  createdAt: Date;
}
