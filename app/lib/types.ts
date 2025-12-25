export type Country = 'Soviet' | 'Republic' | null;

export type GameScreen = 'TITLE' | 'COUNTRY_SELECT' | 'MAIN' | 'MISSIONS';

export type Mission = {
  id: string;
  title: string;
  description: string;
  cost?: number;
  rewardMoney?: number;
  rewardIncome?: number;
  parentId?: string | null;
  completed: boolean;
  unlocked: boolean; // Accessible to be completed
  requirements?: {
    money?: number;
  }
};

export type GameState = {
  screen: GameScreen;
  country: Country;
  date: Date;
  isPlaying: boolean;
  gameSpeed: number; // 1 = normal, 2 = fast, 3 = very fast
  money: number;
  income: number; // Money per hour
  infantryCount: number;
  missions: Mission[];
};
