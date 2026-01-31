
export interface Game {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  category: string;
  scheduledRelease?: string; // ISO string 8:00 segunda feira
}

export interface Title {
  id: string;
  name: string;
  description: string;
  style: string;
  rarity: 'comum' | 'raro' | 'épico' | 'lendário';
}

export interface StudentStats {
  pin: string;
  name: string;
  totalScore: number;
  gamesPlayed: number;
  titles?: string[];
  current_title?: string;
  reset_count?: number;
}
