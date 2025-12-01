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
  createdAt: Date;
  updatedAt: Date;
}
