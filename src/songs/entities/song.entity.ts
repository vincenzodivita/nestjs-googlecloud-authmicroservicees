export interface SongSection {
  name: string;
  bars: number;
}

export interface Song {
  id?: string;
  userId: string;
  name: string;
  bpm: number;
  timeSignature: number;
  sections?: SongSection[];
  sharedWith: string[];   // Array di user IDs con cui è condivisa
  createdAt: Date;
  updatedAt: Date;
}
