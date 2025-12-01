export interface Setlist {
  id?: string;
  userId: string;
  name: string;
  description?: string;
  songs: string[]; // Array of song IDs
  createdAt: Date;
  updatedAt: Date;
}
