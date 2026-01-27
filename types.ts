
export interface Game {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  category: string;
}

export interface StudentStats {
  pin: string;
  name: string;
  totalScore: number;
  gamesPlayed: number;
}
