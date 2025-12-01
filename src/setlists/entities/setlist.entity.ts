export interface Setlist {
  id?: string;
  userId: string;         // Creatore (solo lui può modificare/eliminare)
  name: string;
  description?: string;
  songs: string[];        // Array of song IDs
  sharedWith: string[];   // Array di user IDs con cui è condivisa
  createdAt: Date;
  updatedAt: Date;
}
