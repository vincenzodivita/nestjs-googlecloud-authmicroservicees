export interface SongSection {
  name: string;
  bars: number;
}

export interface Song {
  id?: string;
  userId: string;
  name: string;
  artist?: string;
  description?: string;
  bpm: number;
  timeSignature: number;
  sections?: SongSection[];
  sharedWith: string[];
  createdAt: Date;
  updatedAt: Date;
}